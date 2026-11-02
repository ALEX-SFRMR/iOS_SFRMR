import { View } from 'react-native';
import { Empty, FadeIn, Glass, Inset, Meter, Screen, Section, Text } from '@/ui';
import { AccountButton, Loading, pullToRefresh } from '@/features/common';
import { useActiveProgram, workoutSummary } from '@/data/queries';
import { color, space } from '@/theme/tokens';

const PHASE: Record<string, string> = { cut: 'Cut — hold volume, keep strength', bulk: 'Build — volume ramps each block', maintain: 'Maintain — steady volume' };

export default function Train() {
  const { data, isLoading, isRefetching, refetch } = useActiveProgram();

  return (
    <Screen eyebrow="Program" title="Train" accessory={<AccountButton />} refreshControl={pullToRefresh(isRefetching, refetch)}>
      {isLoading ? (
        <Loading />
      ) : !data ? (
        <Empty
          title="No program yet"
          body="Your coach builds one around the days you can actually train. It lands here for you to review before you start."
        />
      ) : (
        <>
          <FadeIn delay={40}>
            <Glass>
              <View style={{ gap: space.md }}>
                <Text variant="title">{data.meso.name}</Text>
                {data.meso.volume_phase ? <Text tone="dim">{PHASE[data.meso.volume_phase]}</Text> : null}
                <ProgramProgress done={data.workouts.length - data.queue.length} total={data.workouts.length} week={data.meso.current_week} weeks={data.meso.total_weeks} />
              </View>
            </Glass>
          </FadeIn>

          <FadeIn delay={100}>
            <Section label="Up next">
              <Glass padded={false}>
                {data.queue.slice(0, 8).map((w: any, i: number) => {
                  const s = workoutSummary(w);
                  const label = data.labels.get(w.id)?.label ?? '';
                  const isCurrent = data.current?.id === w.id;
                  return (
                    <View key={w.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: space.md, paddingHorizontal: space.lg, gap: space.md, borderTopWidth: i ? 0.5 : 0, borderColor: color.hairline }}>
                      {/* Active rail: the one red mark on this list. */}
                      <View style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: isCurrent ? color.red : 'transparent' }} />
                      <View style={{ width: 64 }}>
                        <Text variant="label" tone={isCurrent ? 'default' : 'dim'}>{label}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text variant="headline" numberOfLines={1}>{w.name}</Text>
                        <Text variant="caption" tone="dim">{s.exercises} exercises · {s.sets} sets</Text>
                      </View>
                    </View>
                  );
                })}
                {data.queue.length === 0 ? (
                  <Inset style={{ margin: space.lg }}><Text tone="dim">Every workout in this block is done.</Text></Inset>
                ) : null}
              </Glass>
            </Section>
          </FadeIn>
        </>
      )}
    </Screen>
  );
}

function ProgramProgress({ done, total, week, weeks }: { done: number; total: number; week?: number; weeks?: number }) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="caption" tone="dim">{week && weeks ? `Week ${week} of ${weeks}` : 'Block progress'}</Text>
        <Text variant="caption" tone="dim">{done} / {total} workouts</Text>
      </View>
      <Meter value={done} max={total} height={6} />
    </View>
  );
}
