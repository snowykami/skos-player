export interface MusicTrack {
  id: number
  name: string
  artists: string[]
  album: string
  albumPic: string
  audio: string
  lyric: string
  link: string
  aliases: string[]
}

export type PlayMode = 'repeat-all' | 'repeat-one' | 'shuffle'

export interface LyricLine { time: number, text: string }
