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

import { Response, ResponseType, fetch } from "@tauri-apps/api/http";
import { useState } from "react";
import { startDrag } from "@crabnebula/tauri-plugin-drag";

import * as wav from "node-wav";
import {
  checkFileExists,
  createPlaceholder,
  writeSampleFile,
  downloadFile,
} from "../../native";
import { path, fs } from "@tauri-apps/api";
import { downloadDir } from "@tauri-apps/api/path";

import { cfg } from "../../config";
import { SamplePlaybackContext } from "../playback";
import { SpliceTag } from "../../splice/entities";
import { SpliceSample } from "../../splice/api";
import { decodeSpliceAudio } from "../../splice/decoder";

const getChordTypeDisplay = (type: string | null) =>
  type == null ? "" : type == "major" ? " Major" : " Minor";

export type TagClickHandler = (tag: SpliceTag) => void;

/**
 * Provides a view describing a Splice sample.
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
        new Blob([decodedSample! as any], {
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
    setDownloading(true);
    setDownloadSuccess(false);

    try {
      console.log("Starting download...");
      await ensureAudioDecoded();
      console.log("Audio decoded successfully");

      // Get system Downloads folder
      const downloadsPath = await downloadDir();
      console.log("Downloads path:", downloadsPath);

      // Create a clean filename: just the base sample name
      const baseSampleName = sample.name.split("/").pop() || sample.name; // Get just the filename part

      // Remove .wav extension if it already exists, then add it back
      const nameWithoutExtension = baseSampleName.replace(/\.wav$/i, "");
      const cleanFileName = `${sanitizePath(pack.name)} - ${sanitizePath(
        nameWithoutExtension
      )}`;

      console.log("Base sample name:", baseSampleName);
      console.log("Clean filename:", cleanFileName);

      const fullPath = await path.join(downloadsPath, cleanFileName);
      console.log("Full path:", fullPath);

      // Check if file already exists
      if (await fs.exists(fullPath)) {
        console.log("File already exists, showing success");
        // File already exists, show success immediately
        setDownloading(false);
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 2000);
        return;
      }

      console.log("Processing audio...");
      // Process the audio
      const actx = new AudioContext();
      const audioBuffer =
        decodedSample!.buffer instanceof ArrayBuffer
          ? decodedSample!.buffer
          : new ArrayBuffer(decodedSample!.buffer.byteLength);
      const samples = await actx.decodeAudioData(audioBuffer);
      console.log(
        "Audio context decoded, channels:",
        samples.numberOfChannels,
        "sample rate:",
        samples.sampleRate
      );

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

      console.log("Encoding to WAV...");
      // Encode as WAV and download directly to Downloads folder
      const wavBuffer = (wav.encode as any)(channels, {
        bitDepth: 16,
        sampleRate: samples.sampleRate,
      });
      console.log("WAV encoded, buffer size:", wavBuffer.length);

      console.log("Saving file...");
      // Save directly to Downloads folder - downloadFile expects baseDir and relativePath
      await downloadFile(downloadsPath, cleanFileName, Buffer.from(wavBuffer));
      console.log("File saved successfully!");

      // Show success message
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2000);
    } catch (error) {
      console.error("Download failed:", error);
      // Also show the error in an alert for debugging
      alert(`Download failed: ${error}`);
    } finally {
      setDownloading(false);
    }
  }

  const sanitizePath = (x: string) => x.replace(/[<>:"|?* ]/g, "_");

  async function handleDrag(ev: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    // Verify that the parent of the element that we began the dragging from
    // is not explicitly marked as non-draggable (as it may be clicked etc.)
    const dragOrigin = document.elementFromPoint(
      ev.clientX,
      ev.clientY
    )?.parentElement;
    if (dragOrigin != null && dragOrigin.dataset.draggable === "false") {
      return;
    }

    const samplePath =
      sanitizePath(pack.name) + "/" + sanitizePath(sample.name);

    const dragParams = {
      item: [await path.join(cfg().sampleDir, samplePath)],
      icon: "",
    };

    setFgLoading(true);
    await ensureAudioDecoded();

    if (!(await checkFileExists(cfg().sampleDir, samplePath))) {
      if (cfg().placeholders) {
        await createPlaceholder(cfg().sampleDir, samplePath);
        startDrag(dragParams);
      }

      const actx = new AudioContext();

      const audioBuffer =
        decodedSample!.buffer instanceof ArrayBuffer
          ? decodedSample!.buffer
          : new ArrayBuffer(decodedSample!.buffer.byteLength);
      const samples = await actx.decodeAudioData(audioBuffer);
      const channels: Float32Array[] = [];

      if (samples.length < 60 * 44100) {
        for (let i = 0; i < samples.numberOfChannels; i++) {
          const chan = samples.getChannelData(i);

          const start = 1200;
          const end = (sample.duration / 1000) * samples.sampleRate + start;

          channels.push(chan.subarray(start, end));
        }
      } else {
        // processing big samples may result in memory allocation errors (it sure did for me!!)
        console.warn(
          `big boi detected of ${samples.length} samples - not pre-processing!`
        );
      }

      await writeSampleFile(
        cfg().sampleDir,
        samplePath,
        (wav.encode as any)(channels, {
          bitDepth: 16,
          sampleRate: samples.sampleRate,
        })
      );

      if (!cfg().placeholders) {
        startDrag(dragParams);
      }

      setFgLoading(false);
    } else {
      setFgLoading(false);
      startDrag(dragParams);
    }
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

          <Tooltip
            content={
              downloadSuccess ? "Downloaded successfully!" : "Download sample"
            }
          >
            <div
              onClick={handleDownload}
              className={`cursor-pointer w-8 transition-colors ${
                downloadSuccess ? "text-green-500" : ""
              }`}
              data-draggable="false"
            >
              {downloading ? (
                <CircularProgress aria-label="Downloading..." className="h-8" />
              ) : downloadSuccess ? (
                <CheckIcon />
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
