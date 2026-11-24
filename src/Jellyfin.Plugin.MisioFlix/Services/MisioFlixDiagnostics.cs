using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.Infrastructure;

namespace Jellyfin.Plugin.MisioFlix.Services;

// Process-local, opt-in aggregate metrics. No URLs, IDs, tokens or payloads.
public static class MisioFlixDiagnostics
{
    private const int Capacity = 256;
    private static readonly object Gate = new();
    private static readonly Dictionary<string, Queue<double>> Samples = new();
    private static readonly Dictionary<string, long> Counts = new();
    private static bool _enabled;
    private static long _generation, _errors;
    private static readonly HashSet<string> Allowed = new(StringComparer.Ordinal)
        { "catalog", "shelf", "shelves", "recommendationCards", "recommendationGenres", "resume", "libraries", "collections" };

    public static void SetEnabled(bool enabled)
    {
        lock (Gate) { if (_enabled != enabled) { _enabled = enabled; ResetLocked(); } }
    }
    public static void Reset() { lock (Gate) ResetLocked(); }
    private static void ResetLocked() { _generation++; _errors = 0; Samples.Clear(); Counts.Clear(); }
    public static long? Begin(string operation)
    {
        lock (Gate) return _enabled && Allowed.Contains(operation) ? _generation : null;
    }
    public static void Complete(string operation, long generation, double ms, bool error)
    {
        lock (Gate)
        {
            if (!_enabled || generation != _generation || !Allowed.Contains(operation)) return;
            if (error) { _errors++; return; }
            if (!double.IsFinite(ms) || ms < 0) return;
            if (!Samples.TryGetValue(operation, out var queue)) Samples[operation] = queue = new Queue<double>(Capacity);
            if (queue.Count == Capacity) queue.Dequeue();
            queue.Enqueue(ms);
            Counts[operation] = Counts.GetValueOrDefault(operation) + 1;
        }
    }
    public static object Snapshot()
    {
        lock (Gate) return new { enabled = _enabled, sampleCapacityPerMetric = Capacity, apiErrors = _errors,
            metrics = Samples.OrderBy(pair => pair.Key).Select(pair => {
                var values = pair.Value.OrderBy(v => v).ToArray();
                return new { operation = pair.Key, totalCount = Counts[pair.Key], sampleCount = values.Length,
                    meanMs = values.Average(), maxMs = values[^1], p95Ms = values[(int)Math.Ceiling(values.Length * .95) - 1] };
            }).ToArray() };
    }
}

// Runs only on explicitly annotated, authenticated controller actions. Does not
// modify results, catch application errors, or add work when disabled beyond a lock.
[AttributeUsage(AttributeTargets.Method)]
public sealed class MisioFlixMeasureAttribute : Attribute, IAsyncActionFilter
{
    private readonly string _operation;
    public MisioFlixMeasureAttribute(string operation) => _operation = operation;
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var generation = MisioFlixDiagnostics.Begin(_operation);
        if (generation is null) { await next(); return; }
        var started = Stopwatch.GetTimestamp();
        bool error = true;
        bool canceled = false;
        try
        {
            var result = await next();
            if (result.Canceled || context.HttpContext.RequestAborted.IsCancellationRequested) { canceled = true; return; }
            error = result.Exception is not null || (result.Result is IStatusCodeActionResult status && status.StatusCode >= 400);
        }
        finally
        {
            if (!canceled && !context.HttpContext.RequestAborted.IsCancellationRequested)
                MisioFlixDiagnostics.Complete(_operation, generation.Value, Stopwatch.GetElapsedTime(started).TotalMilliseconds, error);
        }
    }
}
