<?php

namespace App\Http\Controllers;

use App\Models\LearningProgress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProgressController extends Controller
{
    /** Largest journey state we accept (bytes of JSON). A full 60-day journey is ~15 KB. */
    private const MAX_BYTES = 200_000;

    public function show(Request $request): JsonResponse
    {
        // Always read fresh from the database.
        $progress = LearningProgress::where('user_id', $request->user()->id)->first();

        return response()->json([
            'state' => $progress?->state,
            'updated_at' => $progress?->updated_at?->toIso8601String(),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $request->validate([
            'state' => ['required', 'array'],
            'state.xp' => ['nullable', 'integer', 'min:0', 'max:10000000'],
            'state.done' => ['nullable', 'array'],
        ]);

        $state = $request->input('state');

        if (strlen(json_encode($state)) > self::MAX_BYTES) {
            return response()->json(['message' => 'Progress data is too large.'], 422);
        }

        // Only keep the keys the app uses.
        $state = array_intersect_key($state, array_flip([
            'xp', 'active', 'done', 'early', 'tone', 'speak', 'fast',
        ]));

        $doneDays = array_filter(array_keys($state['done'] ?? []), fn ($d) => ctype_digit((string) $d) && $d >= 1 && $d <= 60);

        $progress = LearningProgress::updateOrCreate(
            ['user_id' => $request->user()->id],
            [
                'course' => 'mandarin-60',
                'state' => $state,
                'days_done' => count($doneDays),
                'xp' => (int) ($state['xp'] ?? 0),
            ]
        );

        return response()->json([
            'ok' => true,
            'updated_at' => $progress->updated_at->toIso8601String(),
        ]);
    }
}
