import { api } from './api.js';

export async function loadChildOverview(child) {
    try {
        return await api.getOverview(child.user_id);
    } catch (error) {
        if (error.status !== 404) {
            throw error;
        }
        return buildFallbackOverview(child, await loadFallbackData(child.user_id));
    }
}

async function loadFallbackData(userId) {
    const [reportResult, configResult] = await Promise.allSettled([
        api.getReport(userId),
        api.getTeachingConfig(userId),
    ]);
    return {
        report: reportResult.status === 'fulfilled' ? reportResult.value : {},
        config: configResult.status === 'fulfilled' ? configResult.value : {},
        reportError: reportResult.status === 'rejected' ? reportResult.reason : null,
        configError: configResult.status === 'rejected' ? configResult.reason : null,
    };
}

function buildFallbackOverview(child, { report, config, reportError, configError }) {
    const teachingConfig = buildTeachingConfigSummary(config);
    const english = buildSubjectSummary('english', report.english, teachingConfig.english_enabled);
    const math = buildSubjectSummary('math', report.math, teachingConfig.math_enabled);
    const subjects = { english, math };
    const alerts = [
        {
            type: 'backend_version',
            severity: 'medium',
            message: 'Backend hiện tại chưa hỗ trợ tổng quan mới, app đang dùng dữ liệu báo cáo cơ bản.',
        },
        ...buildFallbackAlerts(subjects, teachingConfig, reportError, configError),
    ];

    return {
        child: {
            user_id: child.user_id,
            full_name: child.full_name,
            age: child.age,
            preferences: child.preferences || {},
            weak_points: child.weak_points || null,
        },
        teaching_config: teachingConfig,
        daily_usage: {
            used_minutes: 0,
            daily_limit_minutes: teachingConfig.daily_limit_minutes,
            remaining_minutes: teachingConfig.daily_limit_minutes,
            near_limit: false,
            over_limit: false,
            source: 'fallback',
        },
        subjects,
        next_recommendations: buildRecommendations(subjects),
        alerts: alerts.slice(0, 8),
        source: 'fallback_progress_report',
    };
}

function buildTeachingConfigSummary(config = {}) {
    const dailyLimit = Number(config.daily_limit_minutes || 30);
    return {
        english_enabled: config.english_enabled !== false,
        english_level: config.english_level || 'auto',
        english_topics: ensureArray(config.english_topics),
        english_methods: ensureArray(config.english_methods),
        math_enabled: config.math_enabled !== false,
        math_level: config.math_level || 'auto',
        math_operations: ensureArray(config.math_operations),
        daily_limit_minutes: Number.isFinite(dailyLimit) && dailyLimit > 0 ? dailyLimit : 30,
        personality: config.personality || 'friendly',
        language_ratio: config.language_ratio || 'vi_primary',
        encouragement_level: config.encouragement_level || 'high',
        topics_blocked: ensureArray(config.topics_blocked),
        study_schedule: config.study_schedule || { days: [], time: '19:00' },
        camera_learning_enabled: config.camera_learning_enabled !== false,
    };
}

function buildSubjectSummary(subject, report = {}, enabled = true) {
    const levelInfo = report?.level_info || {};
    const daily = report?.daily_summary || {};
    const weekly = report?.weekly_summary || {};
    const dailyAttempts = daily.attempts || {};
    const weeklyAttempts = weekly.attempts || {};
    const summary = {
        enabled,
        level: levelInfo.current_level || 'beginner',
        xp: Number(levelInfo.total_xp || 0),
        streak_days: Number(levelInfo.streak_days || 0),
        placement: report?.placement || { status: 'pending' },
        recommendations: report?.recommendations || [],
        learning_insights: report?.learning_insights || {},
        weak_skills: (report?.skill_mastery || [])
            .filter(item => item?.skill_id && Number(item.mastery_score || 0) < 60)
            .slice(0, 5),
        today: {
            events: Number(daily.total_events || 0),
            answered_attempts: Number(dailyAttempts.answered_attempts || 0),
            correct_attempts: Number(dailyAttempts.correct_attempts || 0),
            incorrect_attempts: Number(dailyAttempts.incorrect_attempts || 0),
            average_score: daily.average_score ?? null,
        },
        week: {
            events: Number(weekly.total_events || 0),
            answered_attempts: Number(weeklyAttempts.answered_attempts || 0),
            correct_attempts: Number(weeklyAttempts.correct_attempts || 0),
            incorrect_attempts: Number(weeklyAttempts.incorrect_attempts || 0),
            average_score: weekly.average_score ?? null,
        },
    };

    if (subject === 'english') {
        summary.word_bank = report?.word_bank || { summary: {}, due_words: [] };
    }
    if (subject === 'math') {
        summary.misconceptions = report?.misconceptions || [];
    }
    return summary;
}

function buildRecommendations(subjects) {
    const recommendations = [];
    for (const [subject, summary] of Object.entries(subjects)) {
        if (!summary.enabled) continue;
        for (const item of summary.recommendations || []) {
            recommendations.push({
                ...item,
                subject,
                title: item.title || item.label || 'Bài học tiếp theo',
            });
        }
    }
    if (!recommendations.length) {
        recommendations.push({
            type: 'next_lesson',
            priority: 'normal',
            label: 'Tiếp tục theo tiến độ hiện tại',
            title: 'Tiếp tục theo tiến độ hiện tại',
            reason: 'fallback_progress_report',
            subject: 'learning',
        });
    }
    return recommendations.slice(0, 6);
}

function buildFallbackAlerts(subjects, config, reportError, configError) {
    const alerts = [];
    if (reportError) {
        alerts.push({
            type: 'report_unavailable',
            severity: 'high',
            message: 'Chưa tải được báo cáo học tập cơ bản.',
        });
    }
    if (configError) {
        alerts.push({
            type: 'config_unavailable',
            severity: 'high',
            message: 'Chưa tải được cấu hình dạy học của bé.',
        });
    }
    const totalToday = Object.values(subjects).reduce(
        (sum, subject) => sum + Number(subject.today?.answered_attempts || 0) + Number(subject.today?.events || 0),
        0,
    );
    if (totalToday === 0) {
        alerts.push({
            type: 'no_learning_today',
            severity: 'medium',
            message: 'Bé chưa có phiên học hôm nay.',
        });
    }
    const wordSummary = subjects.english?.word_bank?.summary || {};
    if (wordSummary.due_words) {
        alerts.push({
            type: 'due_words',
            severity: Number(wordSummary.due_words) >= 3 ? 'high' : 'medium',
            subject: 'english',
            message: `Có ${wordSummary.due_words} từ tiếng Anh đến hạn ôn.`,
        });
    }
    const repeatedMath = (subjects.math?.misconceptions || []).find(item => Number(item.count || 0) >= 2);
    if (repeatedMath) {
        alerts.push({
            type: 'repeated_math_error',
            severity: 'high',
            subject: 'math',
            message: `Có lỗi Toán lặp lại ${repeatedMath.count} lần.`,
        });
    }
    if (!config.english_enabled) {
        alerts.push({
            type: 'subject_disabled',
            severity: 'low',
            subject: 'english',
            message: 'Môn Tiếng Anh đang tắt trong cấu hình.',
        });
    }
    if (!config.math_enabled) {
        alerts.push({
            type: 'subject_disabled',
            severity: 'low',
            subject: 'math',
            message: 'Môn Toán đang tắt trong cấu hình.',
        });
    }
    return alerts;
}

function ensureArray(value) {
    return Array.isArray(value) ? value : [];
}
