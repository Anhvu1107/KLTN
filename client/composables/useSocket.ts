/**
 * Socket.io Client Composable
 * AURA ARCHIVE - Shared WebSocket connection
 * NOTE: Only runs in browser (not SSR)
 */

let socket: any = null
let ioModule: any = null

export const useSocket = () => {
    const config = useRuntimeConfig()

    const connect = async () => {
        // Only run in browser
        if (!import.meta.client) return null
        if (socket?.connected) return socket

        // Dynamic import to avoid SSR issues
        if (!ioModule) {
            const mod = await import('socket.io-client')
            ioModule = mod.io
        }

        const serverUrl = config.public.apiUrl.replace('/api/v1', '')

        socket = ioModule(serverUrl, {
            transports: ['websocket', 'polling'],
            autoConnect: true,
        })

        socket.on('connect', () => {
            console.log('[Socket] Connected:', socket?.id)
        })

        socket.on('disconnect', () => {
            console.log('[Socket] Disconnected')
        })

        return socket
    }

    const getSocket = () => {
        if (!import.meta.client) return null
        return socket
    }

    const joinSession = (sessionId: string) => {
        socket?.emit('join-session', sessionId)
    }

    const joinAdmin = () => {
        socket?.emit('join-admin')
    }

    const onNewMessage = (callback: (data: { sessionId: string; message: any }) => void) => {
        socket?.off('new-message')
        socket?.on('new-message', callback)
    }

    const onSessionUpdated = (callback: (session: any) => void) => {
        socket?.off('session-updated')
        socket?.on('session-updated', callback)
    }

    const disconnect = () => {
        socket?.disconnect()
        socket = null
    }

    return {
        connect,
        getSocket,
        joinSession,
        joinAdmin,
        onNewMessage,
        onSessionUpdated,
        disconnect,
    }
}
