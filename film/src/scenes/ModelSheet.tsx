import React from 'react';
import {Character, ExprName} from '../characters/Character';
import {HText, Shot} from '../lib/paint';
import {C} from '../lib/theme';

/** Character model sheet: the four leads side by side plus an expression row. Used for review. */
export const ModelSheet: React.FC = () => {
  const exprs: ExprName[] = ['neutral', 'happy', 'joy', 'worried', 'sad', 'surprised', 'thinking', 'overwhelmed'];
  return (
    <Shot>
      <HText x={80} y={90} size={44}>Model sheet</HText>
      <Character who="emma" x={200} y={560} expr="content" />
      <Character who="rajan" x={560} y={560} expr="happy" pose="phone" />
      <Character who="sita" x={920} y={560} expr="hopeful" pose="explain" />
      <Character who="bikash" x={1280} y={560} expr="determined" pose="camera" />
      <Character who="pemba" x={1640} y={560} expr="proud" pose="wave" />
      {exprs.map((e, i) => (
        <g key={e}>
          <g transform={`translate(${130 + i * 230} 1020)`}>
            <Character who={(['emma', 'rajan', 'sita', 'bikash'] as const)[i % 4]} x={0} y={0} scale={1.15} expr={e} pose="idle" shadow={false} />
          </g>
          <HText x={110 + i * 230} y={1060} size={26} color={C.inkSoft}>{e}</HText>
        </g>
      ))}
    </Shot>
  );
};
