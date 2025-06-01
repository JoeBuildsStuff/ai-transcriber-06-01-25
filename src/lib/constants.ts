import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Transcriber",
  description:
    "Transform audio into text effortlessly with our AI-powered transcription service.",
  keywords: [
    "AI transcription",
    "audio to text",
    "speech recognition",
    "transcription service",
    "artificial intelligence",
  ],
  authors: [{ name: "AI Transcriber Team" }],
  openGraph: {
    title: "AI Transcriber: Your Audio to Text Solution",
    description:
      "Experience seamless audio transcription with AI. Get accurate text from your audio files in no time.",
    url: "https://aitranscriber.com",
    siteName: "AI Transcriber",
    images: [
      {
        url: "https://aitranscriber.com/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "AI Transcriber Service Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Transcriber: Transcribe Audio with AI",
    description:
      "Convert your audio files to text with our advanced AI transcription service.",
    creator: "@aitranscriber",
    images: ["https://aitranscriber.com/twitter-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    // apple: '/apple-touch-icon.png',
  },
  other: {
    "application-name": "AI Transcriber",
  },
};
