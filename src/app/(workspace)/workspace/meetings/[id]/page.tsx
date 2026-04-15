'use client';

import { use, useMemo } from "react";
import MeetingContentLoader from "./_components/meeting-content-loader";

export default function Page({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const resolvedParams = use(params);
    const id = useMemo(() => resolvedParams.id, [resolvedParams.id]);

    return <MeetingContentLoader id={id} />;
}
