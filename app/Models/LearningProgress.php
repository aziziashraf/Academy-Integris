<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LearningProgress extends Model
{
    protected $table = 'learning_progress';

    protected $fillable = ['user_id', 'course', 'state', 'days_done', 'xp'];

    protected function casts(): array
    {
        return [
            'state' => 'array',
            'days_done' => 'integer',
            'xp' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
