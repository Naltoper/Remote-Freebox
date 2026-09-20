import { FlexWidget, TextWidget } from 'react-native-android-widget';

import type { WidgetViewState } from './widgetState';

type FreeboxWidgetProps = {
  state: WidgetViewState;
};

/**
 * Compact 2×2 Android home-screen widget (RemoteViews via FlexWidget).
 */
export function FreeboxWidget({ state }: FreeboxWidgetProps) {
  const enabled = state.automation.enabled;
  const toggleBg = enabled ? '#3d9a6a' : '#3a4150';
  const toggleLabel = enabled ? 'Auto ON' : 'Auto OFF';

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        padding: 10,
        backgroundColor: '#0a0c10',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#3d4454',
        justifyContent: 'space-between',
        flexGap: 8,
      }}
    >
      <TextWidget
        text="Freebox Remote"
        style={{
          color: '#e8a317',
          fontSize: 13,
          fontWeight: '700',
        }}
      />

      <FlexWidget
        style={{
          flexDirection: 'column',
          flexGap: 2,
          width: 'match_parent',
        }}
      >
        <TextWidget
          text={state.statusLine}
          style={{ color: '#f2f4f8', fontSize: 11, fontWeight: '600' }}
        />
        <TextWidget
          text={state.rangeLine}
          style={{ color: '#9aa3b5', fontSize: 10 }}
        />
        <TextWidget
          text={state.intervalLine}
          style={{ color: '#9aa3b5', fontSize: 10 }}
        />
        <TextWidget
          text={state.nextLine}
          style={{ color: '#e8a317', fontSize: 10, fontWeight: '600' }}
          maxLines={1}
          truncate="END"
        />
        <TextWidget
          text={state.actionStatus}
          style={{
            color: state.busy ? '#e8a317' : '#9aa3b5',
            fontSize: 10,
          }}
          maxLines={2}
          truncate="END"
        />
      </FlexWidget>

      <FlexWidget
        style={{
          flexDirection: 'row',
          width: 'match_parent',
          flexGap: 8,
          alignItems: 'center',
        }}
      >
        <FlexWidget
          clickAction="SMART_START"
          style={{
            flex: 1,
            backgroundColor: '#e8a317',
            borderRadius: 10,
            paddingVertical: 10,
            paddingHorizontal: 6,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TextWidget
            text="Démarrage"
            style={{
              color: '#0a0c10',
              fontSize: 11,
              fontWeight: '700',
              textAlign: 'center',
            }}
          />
          <TextWidget
            text="intelligent"
            style={{
              color: '#0a0c10',
              fontSize: 10,
              fontWeight: '600',
              textAlign: 'center',
            }}
          />
        </FlexWidget>

        <FlexWidget
          clickAction="TOGGLE_AUTO"
          style={{
            flex: 1,
            backgroundColor: toggleBg,
            borderRadius: 10,
            paddingVertical: 10,
            paddingHorizontal: 6,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: enabled ? '#3d9a6a' : '#3d4454',
          }}
        >
          <TextWidget
            text={toggleLabel}
            style={{
              color: '#ffffff',
              fontSize: 12,
              fontWeight: '700',
              textAlign: 'center',
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
