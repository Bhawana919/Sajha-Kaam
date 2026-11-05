import React from 'react';
import {Composition, Still} from 'remotion';
import {PaperGrain} from './scenes/PaperGrain';
import {ModelSheet} from './scenes/ModelSheet';
import {BEATS, STORY_FRAMES, Story, FittedShots, beatFrames, calcStory} from './scenes/story/Story';
import {Demo, calcDemo} from './demo/Demo';
import {BrushAsset, BrushAssetProps} from './scenes/BrushAsset';
import {BgOptions} from './scenes/BgOptions';

const BEAT_COMPS: React.FC[] = BEATS.map((b, i) => () => <FittedShots shots={b.shots} frames={beatFrames(i)} />);

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="SajhaKaamStory" component={Story} durationInFrames={STORY_FRAMES} fps={30} width={1920} height={1080} defaultProps={{vo: false}} calculateMetadata={calcStory} />
    <Composition id="SajhaKaamDemo" component={Demo} durationInFrames={300} fps={30} width={1920} height={1080} defaultProps={{items: [], pan: 20, sections: [], vo: false}} calculateMetadata={calcDemo} />
    {BEATS.map((b, i) => (
      <Composition key={i} id={`Beat${i + 1}`} component={BEAT_COMPS[i]} durationInFrames={beatFrames(i)} fps={30} width={1920} height={1080} />
    ))}
    <Composition id="ModelSheet" component={ModelSheet} durationInFrames={60} fps={30} width={1920} height={1080} />
    <Composition id="BgOptions" component={BgOptions} durationInFrames={200} fps={30} width={1920} height={1080} defaultProps={{shot: 'thread' as const}} />
    <Composition id="BgOptionsCafe" component={() => <BgOptions shot="cafe" />} durationInFrames={200} fps={30} width={1920} height={1080} />
    <Still id="PaperGrain" component={PaperGrain} width={900} height={900} />
    <Still
      id="BrushAsset"
      component={BrushAsset}
      width={1200}
      height={800}
      defaultProps={{kind: 'bloom', color: '#FBE7BD', seed: 1, w: 1200, h: 800} as BrushAssetProps}
      calculateMetadata={({props}) => ({width: props.w, height: props.h})}
    />
  </>
);
