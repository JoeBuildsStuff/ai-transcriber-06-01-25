import { useEffect, useState } from "react"

export const MINUTES_PER_DAY = 24 * 60
const TEN_MINUTES = 10

const getRoundedCurrentMinutes = () => {
  const now = new Date(Date.now())
  const minutes = now.getHours() * 60 + now.getMinutes()
  const roundedMinutes = Math.round(minutes / TEN_MINUTES) * TEN_MINUTES
  if (roundedMinutes < 0) {
    return 0
  }

  if (roundedMinutes > MINUTES_PER_DAY) {
    return MINUTES_PER_DAY
  }

  return roundedMinutes
}

export const useCurrentTimePercentage = () => {
  const [roundedMinutes, setRoundedMinutes] = useState(getRoundedCurrentMinutes)

  useEffect(() => {
    const updateRoundedMinutes = () => {
      setRoundedMinutes(getRoundedCurrentMinutes())
    }

    const intervalId = window.setInterval(updateRoundedMinutes, 60000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  if (roundedMinutes <= 0) {
    return 0
  }

  if (roundedMinutes >= MINUTES_PER_DAY) {
    return 100
  }

  return (roundedMinutes / MINUTES_PER_DAY) * 100
}
