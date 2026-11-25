<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One row per learner: the whole 60-day journey state as JSON,
     * plus a few summary columns for reporting.
     */
    public function up(): void
    {
        Schema::create('learning_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('course', 40)->default('mandarin-60');
            $table->longText('state');
            $table->unsignedSmallInteger('days_done')->default(0);
            $table->unsignedInteger('xp')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('learning_progress');
    }
};
