import { View } from 'react-native';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { Button, Empty, FadeIn, Glass, Inset, Meter, Screen, Section, Text, WeekDots } from '@/ui';
import { AccountButton, Loading, pullToRefresh } from '@/features/common';
import { useActiveProgram, useConsistency, useFuelToday, workoutSummary } from '@/data/queries';
import { statusLine } from '@/core/progress/copy';
import { space } from '@/theme/tokens';

export default function Today() {
  const program = useActiveProgram();
  const consistency = useConsistency();
  const fuel = useFuelToday();
  const refreshing = program.isRefetching || consistency.isRefetching || fuel.isRefetching;
  const refresh = () => { program.refetch(); consistency.refetch(); fuel.refetch(); };

  return (
    <Screen eyebrow={format(new Date(), 'EEEE, MMM d')} title="Today" accessory={<AccountButton />} refreshControl={pullToRefresh(refreshing, refresh)}>
      {/* 1 — The one thing to do. */}
      <FadeIn delay={40}>
        {program.isLoading ? <Loading /> : <NextWorkout data={program.data} />}
      </FadeIn>

      {/* 2 — Where the week stands. */}
      {consistency.data ? (
        <FadeIn delay={100}>
          <Section label="This week">
            <Glass>
              <View style={{ gap: space.md }}>
                <Text variant="headline">
                  {statusLine({
                    counted: consistency.data.week.counted_workouts,
                    standard: consistency.data.week.standard,
                    target: consistency.data.week.target,
                    isDeload: consistency.data.week.is_deload,
                    paused: consistency.data.week.status === 'paused',
                  })}
                </Text>
                <WeekDots counted={consistency.data.week.counted_workouts} target={consistency.data.week.target} standard={consistency.data.week.standard} />
                <Text variant="caption" tone="dim">
                  Standard {consistency.data.week.standard} · Target {consistency.data.week.target}
                  {consistency.data.streak > 0 ? ` · ${consistency.data.streak}-week streak` : ''}
                </Text>
              </View>
            </Glass>
          </Section>
        </FadeIn>
      ) : null}

      {/* 3 — Fuel at a glance. */}
      {fuel.data ? (
        <FadeIn delay={160}>
          <Section label="Fuel">
            {fuel.data.target ? (
              <Glass>
                <View style={{ gap: space.lg }}>
                  <MacroRow label="Calories" value={fuel.data.eaten.calories} max={fuel.data.target.calories} unit="" />
                  <MacroRow label="Protein" value={fuel.data.eaten.protein} max={fuel.data.target.protein} unit="g" />
                </View>
              </Glass>
            ) : (
              <Empty title="No food targets yet" body="Your coach sets calories and protein from your goal and date." />
            )}
          </Section>
        </FadeIn>
      ) : null}
    </Screen>
  );
}

function NextWorkout({ data }: { data: ReturnType<typeof useActiveProgram>['data'] }) {
  if (!data) {
    return (
      <Empty
        title="Let’s build your program"
        body="A short conversation with your coach: your days, your equipment, your goal. You’ll review it before it starts."
        action={<Button title="Build my program" onPress={() => router.push('/train')} />}
      />
    );
  }
  const w = data.current;
  if (!w) {
    return <Empty title="Block complete" body={`${data.meso.name} is done. Your coach can set up the next one.`} />;
  }
  const s = workoutSummary(w);
  const label = w.completed ? 'Done today' : data.labels.get(w.id)?.label ?? 'Next up';
  return (
    <Glass strong>
      <View style={{ gap: space.md }}>
        <Text variant="label" tone="dim">{label} · Week {w.week_number ?? data.meso.current_week ?? 1}</Text>
        <Text variant="title">{w.name}</Text>
        <Text tone="dim">{s.exercises} exercises · {s.sets} working sets</Text>
        <Inset style={{ gap: 6 }}>
          {s.names.slice(0, 4).map((n, i) => (
            <Text key={`${n}-${i}`} numberOfLines={1}>{n}</Text>
          ))}
          {s.names.length > 4 ? <Text tone="faint" variant="caption">+{s.names.length - 4} more</Text> : null}
        </Inset>
        {!w.completed ? <Button title="Start workout" onPress={() => router.push('/train')} /> : null}
      </View>
    </Glass>
  );
}

function MacroRow({ label, value, max, unit }: { label: string; value: number; max: number; unit: string }) {
  const left = Math.max(0, Math.round(max - value));
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text variant="headline">{label}</Text>
        <Text tone="dim" variant="caption">
          {Math.round(value).toLocaleString()} / {max.toLocaleString()}{unit} · {left.toLocaleString()}{unit} left
        </Text>
      </View>
      <Meter value={value} max={max} />
    </View>
  );
}
