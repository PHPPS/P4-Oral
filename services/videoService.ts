// This service handles client-side video generation from an image and text.

/**
 * Creates a video from a background image and a series of texts displayed sequentially.
 * The video is then downloaded by the user.
 * @param imageUrl The URL of the background image (can be data: or blob: URL).
 * @param texts An array of strings to display on the video.
 * @returns A promise that resolves when the download is initiated, or rejects on error.
 */
export const createVideoFromImageAndText = (imageUrl: string, texts: string[]): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        try {
            // 1. Setup Canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }

            // 2. Load Image
            const img = new Image();
            // No crossOrigin needed for data/blob URLs
            img.src = imageUrl;
            await new Promise<void>((res, rej) => {
                img.onload = () => res();
                img.onerror = (err) => rej(new Error('Failed to load image for video export: ' + String(err)));
            });

            // 3. Configure canvas and recorder
            const aspectRatio = img.width / img.height;
            const canvasWidth = 1280;
            const canvasHeight = Math.round(canvasWidth / aspectRatio);
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;

            const stream = canvas.captureStream(30); // 30 FPS
            const mimeType = 'video/webm; codecs=vp9';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                return reject(new Error('WebM with VP9 codec is not supported on this browser.'));
            }
            const recorder = new MediaRecorder(stream, { mimeType });

            const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.push(e.data);
                }
            };
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                
                // 4. Trigger Download
                const a = document.createElement('a');
                a.href = url;
                a.download = '看图说话练习.webm';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                resolve();
            };
            recorder.onerror = (e) => reject((e as ErrorEvent).error || new Error('MediaRecorder error'));


            recorder.start();

            // 5. Animation Logic
            const DURATION_PER_QUESTION = 4000; // 4 seconds
            const FADE_DURATION = 500; // 0.5 seconds fade in/out

            const getLines = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
                const lines: string[] = [];
                let currentLine = '';
                for (const char of text) {
                    const testLine = currentLine + char;
                    if (ctx.measureText(testLine).width > maxWidth && currentLine !== '') {
                        lines.push(currentLine);
                        currentLine = char;
                    } else {
                        currentLine = testLine;
                    }
                }
                if (currentLine) {
                    lines.push(currentLine);
                }
                return lines;
            };

            const drawFrame = (text: string, opacity: number) => {
                // Clear canvas
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // Draw background image
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // Draw overlay for readability
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Draw text
                ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
                ctx.fillStyle = '#FFFFFF';
                ctx.font = `bold ${canvasWidth / 25}px "Noto Sans SC", sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
                ctx.shadowBlur = 10;

                const lines = getLines(ctx, text, canvas.width * 0.9);
                const lineHeight = canvasWidth / 20;
                const totalTextHeight = (lines.length -1) * lineHeight;
                const startY = (canvas.height - totalTextHeight) / 2;

                lines.forEach((line, i) => {
                    ctx.fillText(line, canvas.width / 2, startY + i * lineHeight);
                });
                ctx.globalAlpha = 1.0; // Reset alpha
                ctx.shadowBlur = 0; // Reset shadow
            };

            let currentQuestionIndex = 0;
            let questionStartTime = 0;
            const allTexts = [...texts, "练习结束！"]; // Add an ending slide

            const animate = (time: number) => {
                if (currentQuestionIndex >= allTexts.length) {
                    if (recorder.state === 'recording') {
                       recorder.stop();
                    }
                    return;
                }
                
                if (questionStartTime === 0) questionStartTime = time;

                const elapsedTime = time - questionStartTime;
                const text = allTexts[currentQuestionIndex];
                
                let opacity = 1.0;
                // Fade in
                if (elapsedTime < FADE_DURATION) {
                    opacity = elapsedTime / FADE_DURATION;
                }
                // Fade out
                else if (elapsedTime > DURATION_PER_QUESTION - FADE_DURATION) {
                    opacity = (DURATION_PER_QUESTION - elapsedTime) / FADE_DURATION;
                }

                drawFrame(text, opacity);
                
                if (elapsedTime > DURATION_PER_QUESTION) {
                    currentQuestionIndex++;
                    questionStartTime = time; // Reset timer for next question
                }

                requestAnimationFrame(animate);
            };
            
            requestAnimationFrame(animate);
        } catch (err) {
            reject(err);
        }
    });
};