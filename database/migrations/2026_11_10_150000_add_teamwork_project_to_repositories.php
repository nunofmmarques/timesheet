<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('repositories', function (Blueprint $table) {
            $table->unsignedBigInteger('teamwork_project_id')->nullable()->after('enabled');
            $table->string('teamwork_project_name')->nullable()->after('teamwork_project_id');
        });
    }

    public function down(): void
    {
        Schema::table('repositories', function (Blueprint $table) {
            $table->dropColumn(['teamwork_project_id', 'teamwork_project_name']);
        });
    }
};
