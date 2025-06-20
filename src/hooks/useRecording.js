import { useState, useCallback, useRef } from 'react'

export const useRecording = () => {
    const [isRecording, setIsRecording] = useState(false)
    const [recordingProgress, setRecordingProgress] = useState(0)
    const recordingDataRef = useRef(null)
    const frameCountRef = useRef(0)
    const startTimeRef = useRef(null)

    const startRecording = useCallback((options = {}) => {
        const {
            maxFrames = 120,
            onFrame = null,
            onProgress = null
        } = options

        setIsRecording(true)
        setRecordingProgress(0)
        frameCountRef.current = 0
        startTimeRef.current = Date.now()

        recordingDataRef.current = {
            frames: [],
            maxFrames,
            onFrame,
            onProgress
        }

        return Promise.resolve()
    }, [])

    const recordFrame = useCallback((canvas, timestamp) => {
        if (!isRecording || !recordingDataRef.current) return

        const { frames, maxFrames, onFrame, onProgress } = recordingDataRef.current

        // Capture frame data
        const frameData = {
            dataURL: canvas.toDataURL('image/png'),
            timestamp: timestamp || (Date.now() - startTimeRef.current),
            index: frameCountRef.current
        }

        frames.push(frameData)
        frameCountRef.current++

        // Call custom frame handler
        if (onFrame) {
            onFrame(frameData)
        }

        // Update progress
        const progress = Math.min(frameCountRef.current / maxFrames, 1)
        setRecordingProgress(progress)

        if (onProgress) {
            onProgress(progress)
        }

        // Auto-stop if max frames reached
        if (frameCountRef.current >= maxFrames) {
            stopRecording()
        }
    }, [isRecording])

    const stopRecording = useCallback(() => {
        setIsRecording(false)
        setRecordingProgress(1)

        const frames = recordingDataRef.current?.frames || []
        recordingDataRef.current = null

        return frames
    }, [])

    const getRecordingData = useCallback(() => {
        return recordingDataRef.current?.frames || []
    }, [])

    return {
        isRecording,
        recordingProgress,
        startRecording,
        recordFrame,
        stopRecording,
        getRecordingData
    }
}