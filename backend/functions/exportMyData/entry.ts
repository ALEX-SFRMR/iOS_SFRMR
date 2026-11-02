import { createClientFromRequest } from 'npm:@base44/sdk@0.8.57';

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

async function gatherAll(base44, entityName, userId) {
  const out = [];
  try {
    let skip = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities[entityName].filter(
        { user_id: userId },
        '-created_date',
        100,
        skip
      );
      if (!batch || batch.length === 0) break;
      out.push(...batch);
      if (batch.length < 100) break;
      skip += 100;
    }
  } catch (_) {
    // Entity not present in this app — skip.
  }
  return out;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = {
      export_generated_at: new Date().toISOString(),
      account: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        created_date: user.created_date,
        tier: user.tier || null,
        birthday: user.birthday || null,
        gender: user.gender || null,
        weight_unit: user.weight_unit || null,
        height_unit: user.height_unit || null,
        activity_level: user.activity_level || null,
      },
      entities: {},
    };

    for (const entityName of USER_OWNED_ENTITIES) {
      data.entities[entityName] = await gatherAll(base44, entityName, user.id);
    }

    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});