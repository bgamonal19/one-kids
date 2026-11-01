import Svg, { Path, Rect, Circle } from 'react-native-svg';
export type TutorTool = 'keyboard' | 'edit' | 'mic' | 'volume' | 'muted' | 'voice' | 'camera' | 'file' | 'send';
/** Small, consistent outline icons; button labels remain available to screen readers. */
export function TutorToolIcon({ name, color = '#536779' }: { name: TutorTool; color?: string }) {
  return <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    {name === 'keyboard' ? <><Rect x={2} y={5} width={20} height={14} rx={3} /><Path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10" /></> : null}
    {name === 'edit' ? <><Path d="m4 16-1 5 5-1L20 8a2.8 2.8 0 0 0-4-4L4 16Zm10-10 4 4M4 16l4 4" /></> : null}
    {name === 'mic' ? <><Rect x={9} y={2} width={6} height={12} rx={3} /><Path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" /></> : null}
    {name === 'volume' || name === 'muted' ? <><Path d="M11 4 6 8H3v8h3l5 4V4Z" />{name === 'volume' ? <Path d="M15 8a6 6 0 0 1 0 8M18 4a11 11 0 0 1 0 16" /> : <Path d="m16 9 5 6m0-6-5 6" />}</> : null}
    {name === 'voice' ? <Path d="M3 10v4M7 6v12M12 3v18M17 7v10M21 10v4" /> : null}
    {name === 'camera' ? <><Path d="M8 5 9.5 3h5L16 5h4a2 2 0 0 1 2 2v12H2V7a2 2 0 0 1 2-2h4Z" /><Circle cx={12} cy={12} r={4} /></> : null}
    {name === 'file' ? <><Path d="M14 2H5v20h14V7l-5-5Zm0 0v6h5M8 13h8M8 17h6" /></> : null}
    {name === 'send' ? <Path d="m5 12 7-7 7 7M12 5v15" /> : null}
  </Svg>;
}
