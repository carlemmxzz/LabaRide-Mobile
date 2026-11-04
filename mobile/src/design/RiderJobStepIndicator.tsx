import { View } from 'react-native';
import { Check } from 'lucide-react-native';
import { Txt, styles, usePalette } from './ui';
import { riderJobProgress, type RiderProgressJob } from './rider-job-steps';

export function RiderJobStepIndicator({ job }: { job: RiderProgressJob }) {
  const palette = usePalette();
  const { steps, current, detail, complete, stopped } = riderJobProgress(job);
  return <View testID="rider-job-progress" style={{ gap: 10 }}>
    <View accessibilityRole="progressbar" accessibilityLabel={`${job.stage} job progress`}
      accessibilityValue={{ min: 1, max: 5, now: current + 1, text: `Step ${current + 1} of 5: ${steps[current]}` }}
      style={{ flexDirection: 'row', width: '100%' }}>
      {steps.map((title, index) => {
        const done = index < current || complete;
        const accent = stopped && index === current ? palette.danger : palette.primary;
        return <View key={title} style={{ flex: 1, minWidth: 0, minHeight: 70, paddingVertical: 6, gap: 6, borderRadius: 10,
          backgroundColor: index === current ? palette.soft : 'transparent' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, height: 2, backgroundColor: index === 0 ? 'transparent' : index <= current ? palette.primary : palette.line }} />
            <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
              borderColor: index <= current ? accent : palette.line, backgroundColor: done ? palette.primary : 'white' }}>
              {done ? <Check size={14} color="white" /> : <Txt style={{ fontSize: 11, fontWeight: '700', color: index === current ? accent : palette.muted }}>{index + 1}</Txt>}
            </View>
            <View style={{ flex: 1, height: 2, backgroundColor: index === steps.length - 1 ? 'transparent' : index < current ? palette.primary : palette.line }} />
          </View>
          <Txt numberOfLines={2} style={{ textAlign: 'center', fontSize: 10, lineHeight: 14, fontWeight: index === current ? '700' : '500',
            color: index === current ? accent : index < current ? palette.primary : palette.muted }}>{title}</Txt>
        </View>;
      })}
    </View>
    <Txt accessibilityLiveRegion="polite" style={styles.muted}>{detail}</Txt>
  </View>;
}
