using System;
using System.IO;
using System.Net.Http;
using MediaBrowser.Common.Configuration;
using System.Text;
using System.Threading.Tasks;
using MediaBrowser.Controller;
using MediaBrowser.Controller.Plugins;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Jellyfin.Plugin.MisioFlix.Services;

namespace Jellyfin.Plugin.MisioFlix.Services;

/// <summary>
/// First-party, request-time injection of native Jellyfin styling. DOES NOT write to /jellyfin/jellyfin-web.
/// Works only when registered ahead of the static web middleware. Test on 12.4.
/// </summary>
public sealed class MisioFlixStartupFilter : IStartupFilter
{
    public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next)
    {
        return app =>
        {
            app.Use(async (ctx, downstream) =>
            {
                // Keep all other Jellyfin endpoints completely untouched.
                if (Plugin.Instance?.Configuration.Enabled != true ||
                    ctx.Request.Method != HttpMethods.Get ||
                    !IsIndex(ctx.Request.Path.Value))
                {
                    await downstream().ConfigureAwait(false);
                    return;
                }

                // Avoid compressed HTML while buffering. This affects only index.html.
                ctx.Request.Headers.Remove("Accept-Encoding");
                var originalStream = ctx.Response.Body;
                await using var memory = new MemoryStream();
                ctx.Response.Body = memory;
                try
                {
                    await downstream().ConfigureAwait(false);
                }
                catch
                {
                    ctx.Response.Body = originalStream;
                    throw;
                }

                ctx.Response.Body = originalStream;
                memory.Position = 0;
                if (ctx.Response.StatusCode != StatusCodes.Status200OK ||
                    !(ctx.Response.ContentType?.Contains("text/html", StringComparison.OrdinalIgnoreCase) ?? false) ||
                    ctx.Response.Headers.ContainsKey("Content-Encoding"))
                {
                    await memory.CopyToAsync(originalStream, ctx.RequestAborted).ConfigureAwait(false);
                    return;
                }

                var input = Encoding.UTF8.GetString(memory.ToArray());
                if (!input.Contains("</head>", StringComparison.OrdinalIgnoreCase))
                {
                    await memory.CopyToAsync(originalStream, ctx.RequestAborted).ConfigureAwait(false);
                    return;
                }

                // Stable marker; actual DLL assembly version controls browser cache-busting.
                const string marker = "data-misioflix=\"skin\"";
                if (!input.Contains(marker, StringComparison.Ordinal))
                {
                    var version = typeof(Plugin).Assembly.GetName().Version?.ToString() ?? "0.0.0.0";
                    var inject = "<link data-misioflix=\"skin\" rel=\"stylesheet\" href=\"../MisioFlix/assets/theme.css?v=" + version + "\">" +
                        "<script data-misioflix=\"skin\" defer src=\"../MisioFlix/assets/client.js?v=" + version + "\"></script>" +
                        "<script data-misioflix=\"home\" defer src=\"../MisioFlix/assets/home.js?v=" + version + "\"></script>" +
                        "<script data-misioflix=\"details\" defer src=\"../MisioFlix/assets/details.js?v=" + version + "\"></script>" +
                        "<script data-misioflix=\"mal\" defer src=\"../MisioFlix/assets/mal.js?v=" + version + "\"></script>" +
                        "<link data-misioflix=\"simkl\" rel=\"stylesheet\" href=\"../MisioFlix/assets/simkl.css?v=" + version + "\">" +
                        "<script data-misioflix=\"simkl\" defer src=\"../MisioFlix/assets/simkl.js?v=" + version + "\"></script>";
                    var at = input.LastIndexOf("</head>", StringComparison.OrdinalIgnoreCase);
                    input = input.Insert(at, inject);
                }

                var bytes = Encoding.UTF8.GetBytes(input);
                ctx.Response.Headers.Remove("ETag");
                ctx.Response.Headers.Remove("Last-Modified");
                ctx.Response.Headers.Remove("Content-MD5");
                ctx.Response.Headers.CacheControl = "no-store";
                ctx.Response.ContentLength = bytes.Length;
                await originalStream.WriteAsync(bytes, ctx.RequestAborted).ConfigureAwait(false);
            });
            next(app);
        };
    }

    private static bool IsIndex(string? path)
    {
        if (string.IsNullOrWhiteSpace(path)) return false;
        // May also work with an application PathBase, which ASP.NET strips.
        return path.Equals("/web", StringComparison.OrdinalIgnoreCase) ||
               path.Equals("/web/", StringComparison.OrdinalIgnoreCase) ||
               path.Equals("/web/index.html", StringComparison.OrdinalIgnoreCase);
    }
}

public sealed class MisioFlixServiceRegistrator : IPluginServiceRegistrator
{
    public void RegisterServices(IServiceCollection services, IServerApplicationHost applicationHost)
    {
        services.AddTransient<IStartupFilter, MisioFlixStartupFilter>();
        services.AddHostedService<MisioFlixMalRefreshHostedService>();
        services.AddSingleton<MisioFlixSimklLocalStore>();
        services.AddHostedService<MisioFlixSimklPlaybackHostedService>();
        // Device-PIN sessions and read snapshots MUST survive separate HTTP requests.
        // Typed AddHttpClient<T> is transient; it would forget the pending PIN before poll!
        services.AddHttpClient("MisioFlixSimkl", http => { http.Timeout=TimeSpan.FromSeconds(30); })
            .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect=false });
        services.AddSingleton<MisioFlixSimklService>(provider => new MisioFlixSimklService(
            provider.GetRequiredService<IHttpClientFactory>().CreateClient("MisioFlixSimkl"),
            provider.GetRequiredService<IApplicationPaths>(),
            provider.GetRequiredService<MisioFlixSimklLocalStore>()));
        services.AddHttpClient<MisioFlixMalService>(http => { http.Timeout=TimeSpan.FromSeconds(30); })
            .ConfigurePrimaryHttpMessageHandler(() => new System.Net.Http.HttpClientHandler { AllowAutoRedirect=false });
        services.AddHttpClient<MisioFlixCatalogService>(http =>
        {
            http.Timeout = TimeSpan.FromSeconds(30);
        });
    }
}
