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
        Schema::create('constant_tasks', function (Blueprint $table) {
            $table->id();
            $table->unsignedTinyInteger('weekday');
            $table->string('start_time', 5);
            $table->string('end_time', 5);
            $table->unsignedInteger('teamwork_project_id');
            $table->string('teamwork_project_name');
            $table->unsignedInteger('teamwork_task_id');
            $table->string('teamwork_task_name');
            $table->boolean('billable')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('constant_tasks');
    }
};
