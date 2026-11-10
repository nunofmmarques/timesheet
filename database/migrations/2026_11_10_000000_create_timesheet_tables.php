<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('timesheet_settings', function (Blueprint $table) {
            $table->id();
            $table->string('author_email')->nullable();
            $table->unsignedSmallInteger('idle_gap_minutes')->default(60);
            $table->unsignedSmallInteger('padding_minutes')->default(15);
            $table->unsignedSmallInteger('minimum_minutes')->default(30);
            $table->unsignedSmallInteger('round_to_minutes')->default(15);
            $table->timestamps();
        });

        Schema::create('repositories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('path')->unique();
            $table->boolean('enabled')->default(true);
            $table->timestamps();
        });

        Schema::create('timesheet_overrides', function (Blueprint $table) {
            $table->id();
            $table->string('entry_key', 64)->unique();
            $table->unsignedSmallInteger('minutes')->nullable();
            $table->text('description')->nullable();
            $table->boolean('included')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('timesheet_overrides');
        Schema::dropIfExists('repositories');
        Schema::dropIfExists('timesheet_settings');
    }
};
