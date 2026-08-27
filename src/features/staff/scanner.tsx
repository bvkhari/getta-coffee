"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Pulled out of whatever the code decodes to, rather than parsed as a URL.
 * The QR carries the staff URL for a member, but a code printed by staging and
 * scanned on production still names the same person — both share one database —
 * and matching the id alone keeps that working instead of rejecting the host.
 */
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function explain(error: unknown): string {
  const name = (error as { name?: string })?.name;
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Camera access was blocked. Allow it in the browser's site settings, or use the keypad.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No camera on this device. Use the keypad instead.";
  }
  if (name === "NotReadableError") {
    return "The camera is busy in another app. Close it and try again.";
  }
  return "Couldn't start the camera. Use the keypad instead.";
}

export function Scanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frame = 0;
    // Guards the whole teardown: React runs effects twice in development, and
    // without it the second pass adopts a camera the first pass is stopping.
    let finished = false;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });

    function stop() {
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
    }

    async function run() {
      // Undefined on plain http from anything but localhost, which is the most
      // likely way this breaks: a phone opening a dev server over the LAN.
      if (!navigator.mediaDevices?.getUserMedia) {
        setProblem(
          "The camera needs a secure (https) connection. Use the keypad instead.",
        );
        return;
      }

      let decode: typeof import("jsqr").default;
      try {
        // Loaded only once staff actually open the scanner, so the ~40KB never
        // lands on the passcode screen or the member screen.
        decode = (await import("jsqr")).default;
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
      } catch (error) {
        setProblem(explain(error));
        return;
      }

      const video = videoRef.current;
      if (finished || !video) {
        stop();
        return;
      }

      video.srcObject = stream;
      try {
        await video.play();
      } catch {
        // autoPlay/muted/playsInline already cover the mobile autoplay rules;
        // a rejection here is not worth failing the whole scanner over.
      }

      const tick = () => {
        if (finished) return;

        const width = video.videoWidth;
        const height = video.videoHeight;

        if (context && width && height) {
          canvas.width = width;
          canvas.height = height;
          context.drawImage(video, 0, 0, width, height);

          const found = decode(
            context.getImageData(0, 0, width, height).data,
            width,
            height,
            // The codes are dark-on-light on a phone screen. Skipping the
            // inverted pass halves the work per frame on a cheap staff handset.
            { inversionAttempts: "dontInvert" },
          );

          const id = found?.data.match(UUID)?.[0];
          if (id) {
            finished = true;
            // Released before navigating, so the camera indicator goes out
            // rather than staying lit through the whole stamping screen.
            stop();
            router.push(`/staff/member/${id}`);
            return;
          }
        }

        frame = requestAnimationFrame(tick);
      };

      frame = requestAnimationFrame(tick);
    }

    run();

    return () => {
      finished = true;
      stop();
    };
  }, [router]);

  if (problem) {
    return (
      <p className="err" role="alert" style={{ marginTop: 26 }}>
        {problem}
      </p>
    );
  }

  return (
    <>
      <p className="eyebrow" style={{ textAlign: "center", marginTop: 26 }}>
        Scan the customer&rsquo;s code
      </p>
      <div className="scanner">
        <video ref={videoRef} autoPlay muted playsInline />
        <span className="reticle" aria-hidden="true" />
      </div>
      <p className="center-note" role="status">
        Point the camera at the code on their phone.
      </p>
    </>
  );
}
