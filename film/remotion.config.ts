import {Config} from '@remotion/cli/config';

// Use the locally installed Chrome so Remotion does not download a browser.
Config.setBrowserExecutable('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setConcurrency(6);
Config.setCodec('h264');
Config.setCrf(18);
Config.setPixelFormat('yuv420p');
Config.setOverwriteOutput(true);
Config.setChromiumOpenGlRenderer('angle');
