// Upload a short video (up to 2 minutes) straight from the phone or laptop to Cloudinary.
// Sajha Kaam's server only signs the upload, so the file never passes through it and the
// Cloudinary secret never reaches the app. Length and size are checked before uploading (so
// nobody waits for a file that will be refused) and again from Cloudinary's answer.
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { api } from '@/api/client';
import { useT } from '@/i18n';
import { colors, radius, space } from '@/theme';

import { Txt } from './Txt';
import { Button } from './ui';

type Signature = {
  api_key: string; timestamp: number; signature: string; folder: string; allowed_formats: string; upload_url: string;
};
type Limits = { max_seconds: number; max_mb: number };

const SLACK_S = 5; // phones round lengths; 2:04 is still "2 minutes"

function clock(seconds: number): string {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** The length of a picked video in seconds, if the picker or the browser can tell. */
async function lengthOf(asset: ImagePicker.ImagePickerAsset): Promise<number | null> {
  if (asset.duration) return asset.duration / 1000;
  if (Platform.OS !== 'web' || typeof document === 'undefined') return null;
  return new Promise((resolve) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => resolve(Number.isFinite(v.duration) ? v.duration : null);
    v.onerror = () => resolve(null);
    v.src = asset.uri;
  });
}

function upload(sig: Signature, asset: ImagePicker.ImagePickerAsset, file: Blob | null,
  onProgress: (p: number) => void): Promise<{ secure_url: string; duration?: number }> {
  const form = new FormData();
  if (file) form.append('file', file);
  else form.append('file', { uri: asset.uri, name: asset.fileName ?? 'video.mp4', type: asset.mimeType ?? 'video/mp4' } as never);
  for (const k of ['api_key', 'timestamp', 'signature', 'folder', 'allowed_formats'] as const) form.append(k, String(sig[k]));
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', sig.upload_url);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && body.secure_url) resolve(body);
        else reject(new Error(body?.error?.message ?? 'upload_failed'));
      } catch {
        reject(new Error('upload_failed'));
      }
    };
    xhr.onerror = () => reject(new Error('upload_failed'));
    xhr.send(form);
  });
}

export function VideoUpload({ limits, value, onUploaded }: { limits: Limits; value: string; onUploaded: (url: string) => void }) {
  const { t, digits } = useT();
  const [progress, setProgress] = useState<number | null>(null);
  const [problem, setProblem] = useState('');
  const [length, setLength] = useState<number | null>(null);

  const choose = async () => {
    setProblem('');
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], videoMaxDuration: limits.max_seconds,
      allowsEditing: false, quality: 1 });
    if (picked.canceled || !picked.assets?.length) return;
    const asset = picked.assets[0];
    const file = asset.file ?? null; // web: the File the browser picked
    const size = asset.fileSize ?? file?.size ?? 0;
    if (size > limits.max_mb * 1024 * 1024) {
      setProblem(t('upload.tooBig', { mb: digits(Math.ceil(size / 1024 / 1024)), max: digits(limits.max_mb) }));
      return;
    }
    const secs = await lengthOf(asset);
    if (secs && secs > limits.max_seconds + SLACK_S) {
      setProblem(t('upload.tooLong', { time: digits(clock(secs)) }));
      return;
    }
    try {
      setProgress(0);
      const sig = await api<Signature>('/v1/uploads/video', { method: 'POST' });
      const done = await upload(sig, asset, file, setProgress);
      if (done.duration && done.duration > limits.max_seconds + SLACK_S) {
        setProblem(t('upload.tooLong', { time: digits(clock(done.duration)) }));
        return;
      }
      setLength(done.duration ?? secs);
      onUploaded(done.secure_url);
    } catch {
      setProblem(t('upload.failed'));
    } finally {
      setProgress(null);
    }
  };

  const uploaded = !!value && value.includes('res.cloudinary.com');
  return (
    <View style={{ gap: space.sm }}>
      {progress !== null ? (
        <View style={{ gap: space.xs }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: progress }}>
          <Txt variant="label">{t('upload.uploading', { percent: digits(progress) })}</Txt>
          <View style={{ height: 8, borderRadius: radius.pill, backgroundColor: colors.paperDeep, overflow: 'hidden' }}>
            <View style={{ width: `${progress}%`, height: 8, backgroundColor: colors.brick }} />
          </View>
        </View>
      ) : uploaded ? (
        <>
          <Txt variant="label" color={colors.green}>
            {length ? t('upload.doneTime', { time: digits(clock(length)) }) : t('upload.done')}
          </Txt>
          <Button kind="quiet" label={t('upload.change')} onPress={choose} />
        </>
      ) : (
        <Button kind="secondary" icon="upload" label={t('upload.button')} onPress={choose} />
      )}
      {problem ? <Txt variant="small" color={colors.brick}>{problem}</Txt> : null}
    </View>
  );
}
