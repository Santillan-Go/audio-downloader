import { Chip, CircularProgress, Tooltip } from "@nextui-org/react";
import {
  ClockCircleLinearIcon,
  ClockSquareBoldIcon,
} from "@nextui-org/shared-icons";
import { MusicalNoteIcon } from "@heroicons/react/20/solid";
import {
  PlayIcon,
  StopIcon,
  ArrowDownTrayIcon,
  CheckIcon,
} from "@heroicons/react/20/solid";

import { Response, ResponseType, fetch } from "../../http.web";
import { useState } from "react";

import * as wav from "node-wav";
import { downloadFile } from "../../native.web";
import { SamplePlaybackContext } from "../playback";
import { SpliceTag } from "../../splice/entities";
import { SpliceSample } from "../../splice/api";
import { decodeSpliceAudio } from "../../splice/decoder";

const getChordTypeDisplay = (type: string | null) =>
  type == null ? "" : type == "major" ? " Major" : " Minor";

export type TagClickHandler = (tag: SpliceTag) => void;

/**
 * Provides a view describing a Splice sample (Web version).
 */
export default function SampleListEntry({
  sample,
  ctx,
  onTagClick,
}: {
  sample: SpliceSample;
  ctx: SamplePlaybackContext;
  onTagClick: TagClickHandler;
}) {
  const [fgLoading, setFgLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const audio = document.createElement("audio");

  const pack = sample.parents.items[0];
  const packCover = pack
    ? pack.files.find((x) => x.asset_file_type_slug == "cover_image")?.url
    : "img/missing-cover.png";

  let decodedSample: Uint8Array | null = null;

  let fetchAhead: Promise<Response<ArrayBuffer>> | null = null;
  function startFetching() {
    if (fetchAhead != null) return;

    const file = sample.files.find(
      (x) => x.asset_file_type_slug == "preview_mp3"
    )!;

    fetchAhead = fetch<ArrayBuffer>(file.url, {
      method: "GET",
      responseType: ResponseType.Binary,
    });
  }

  audio.onended = () => setPlaying(false);

  function stop() {
    audio.pause();
    audio.currentTime = 0;
    setPlaying(false);
  }

  async function handlePlayClick() {
    ctx.cancellation?.();

    if (playing) return;

    if (audio.src == "") {
      setFgLoading(true);
      await ensureAudioDecoded();
      setFgLoading(false);

      audio.src = URL.createObjectURL(
        new Blob([new Uint8Array(decodedSample!)], {
          type: "audio/mpeg",
        })
      );
    }

    audio.play();
    setPlaying(true);

    ctx.setCancellation(() => stop);
  }

  async function ensureAudioDecoded() {
    if (decodedSample != null) return;

    if (fetchAhead == null) {
      startFetching();
    }

    const resp = await fetchAhead;
    decodedSample = decodeSpliceAudio(new Uint8Array(resp!.data));
  }

  async function handleDownload() {
    // console.log("Starting download...");
    setDownloading(true);
    setDownloadSuccess(false);

    try {
      await ensureAudioDecoded();
      // console.log("Audio decoded successfully");

      // Create a clean filename for web download
      const cleanPackName = sanitizePath(pack.name);
      const baseSampleName = sample.name.split("/").pop() || "sample";

      // Remove .wav extension if it already exists, then add it back
      const nameWithoutExtension = baseSampleName.replace(/\.wav$/i, "");
      const cleanSampleName = sanitizePath(nameWithoutExtension);
      const cleanFileName = `${cleanPackName} - ${cleanSampleName}.wav`;

      // console.log("Clean filename:", cleanFileName);

      // Process the audio
      const actx = new AudioContext();
      // Convert to a proper ArrayBuffer
      const arrayBuffer = new ArrayBuffer(decodedSample!.byteLength);
      new Uint8Array(arrayBuffer).set(decodedSample!);
      const samples = await actx.decodeAudioData(arrayBuffer);
      const channels: Float32Array[] = [];

      if (samples.length < 60 * 44100) {
        for (let i = 0; i < samples.numberOfChannels; i++) {
          const chan = samples.getChannelData(i);
          const start = 1200;
          const end = (sample.duration / 1000) * samples.sampleRate + start;
          channels.push(chan.subarray(start, end));
        }
      } else {
        console.warn(
          `Large sample detected of ${samples.length} samples - not pre-processing!`
        );
        for (let i = 0; i < samples.numberOfChannels; i++) {
          channels.push(samples.getChannelData(i));
        }
      }

      // Encode as WAV and trigger browser download
      const wavBuffer = (wav.encode as any)(channels, {
        bitDepth: 16,
        sampleRate: samples.sampleRate,
      });

      // console.log("Triggering download...");

      // Trigger browser download
      await downloadFile("", cleanFileName, Buffer.from(wavBuffer));

      // Show success message
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2000);

      // console.log("Download completed successfully");
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setDownloading(false);
    }
  }

  const sanitizePath = (x: string) => x.replace(/[<>:"|?* /\\\\]/g, "_");

  // Remove drag functionality for web version
  async function handleDrag() {
    // No drag functionality in web version
    console.log("Drag functionality not available in web version");
  }

  return (
    <div
      onMouseOver={startFetching}
      className={`flex w-full px-4 py-2 gap-8 rounded transition-background
                    items-center hover:bg-foreground-100 cursor-grab select-none`}
    >
      {/* when loading, set the cursor for everything to a waiting icon */}
      {fgLoading && <style> {`* { cursor: wait }`} </style>}

      {/* sample pack */}
      <div className="flex gap-4 min-w-20">
        <Tooltip
          content={
            <div className="flex flex-col gap-2 p-4">
              <img
                src={packCover}
                alt={pack.name}
                width={128}
                height={128}
              ></img>
              <h1>{pack.name}</h1>
            </div>
          }
        >
          <a
            href={`https://splice.com/sounds/labels/${pack.permalink_base_url}`}
            target="_blank"
          >
            <img src={packCover} alt={pack.name} width={32} height={32} />
          </a>
        </Tooltip>

        <div className="flex gap-2">
          <div onClick={handlePlayClick} className="cursor-pointer w-8">
            {fgLoading ? (
              <CircularProgress
                aria-label="Loading sample..."
                className="h-8"
              />
            ) : playing ? (
              <StopIcon />
            ) : (
              <PlayIcon />
            )}
          </div>

          <Tooltip content="Download sample">
            <div
              onClick={handleDownload}
              className="cursor-pointer w-8"
              data-draggable="false"
            >
              {downloading ? (
                <CircularProgress aria-label="Downloading..." className="h-8" />
              ) : downloadSuccess ? (
                <CheckIcon className="text-green-500" />
              ) : (
                <ArrowDownTrayIcon />
              )}
            </div>
          </Tooltip>
        </div>
      </div>

      {/* sample name + tags */}
      <div className="grow" onMouseDown={handleDrag}>
        <div className="flex gap-1 max-w-[50vw] overflow-clip">
          {sample.name.split("/").pop()}
          <div className="text-foreground-400">
            ({sample.asset_category_slug})
          </div>
        </div>

        <div className="flex gap-1">
          {sample.tags.map((x) => (
            <Chip
              key={x.uuid}
              size="sm"
              style={{ cursor: "pointer" }}
              onClick={() => onTagClick(x)}
              data-draggable="false"
            >
              {x.label}
            </Chip>
          ))}
        </div>
      </div>

      {/* other metadata */}
      <div className="flex gap-8" onMouseDown={handleDrag}>
        {sample.key != null ? (
          <div className="flex items-center gap-2 font-semibold text-foreground-500">
            <MusicalNoteIcon className="w-4" />
            <span>{`${sample.key.toUpperCase()}${getChordTypeDisplay(
              sample.chord_type
            )}`}</span>
          </div>
        ) : (
          <></>
        )}

        <div className="flex items-center gap-2 font-semibold text-foreground-500">
          <ClockCircleLinearIcon />
          <span>{`${(sample.duration / 1000).toFixed(2)}s`}</span>
        </div>

        {sample.bpm != null ? (
          <div className="flex items-center gap-2 font-semibold text-foreground-500">
            <ClockSquareBoldIcon />
            <span>{`${sample.bpm} BPM`}</span>
          </div>
        ) : (
          <></>
        )}
      </div>
    </div>
  );
}
