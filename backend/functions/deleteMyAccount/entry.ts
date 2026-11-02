import { createClientFromRequest } from 'npm:@base44/sdk@0.8.57';

// Entities that store data keyed on `user_id`. We wipe ALL of them
// before deleting the User record itself. Apple requires that account
// deletion be fully completed in-app.
const USER_OWNED_ENTITIES = [
  'TrainingProfile',
  'WeeklyPlanTemplate',
  'Mesocycle',
  'Workout',
  'TotalPlan',
  'Meal',
  'WeightLog',
  'ConsistencyProfile',
  'TrainingWeek',
  'ExerciseProgress',
  'PersonalRecord',
  'MilestoneEvent',
];

async function deleteAllForUser(base44, entityName, userId) {
  let removed = 0;
  try {
    // Paginate to avoid loading everything into memory at once.
    while (true) {
      const records = await base44.asServiceRole.entities[entityName].filter(
        { user_id: userId },
        '-created_date',
        100
      );
      if (!records || records.length === 0) break;
      for (const rec of records) {
        try {
          await base44.asServiceRole.entities[entityName].delete(rec.id);
          removed += 1;
        } catch (_) {
          // Skip records we can't delete and continue.
        }
      }
      if (records.length < 100) break;
    }
  } catch (_) {
    // Entity may not exist in this app — ignore.
  }
  return removed;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    const summary = {};

    // 1. Wipe all user-owned records across every entity.
    for (const entityName of USER_OWNED_ENTITIES) {
      summary[entityName] = await deleteAllForUser(base44, entityName, userId);
    }

    // 2. Finally delete the User record itself.
    let userDeleted = false;
    try {
      await base44.asServiceRole.entities.User.delete(userId);
      userDeleted = true;
    } catch (e) {
      return Response.json(
        { error: 'Account data wiped but user record could not be removed: ' + e.message, summary },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      userDeleted,
      summary,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});