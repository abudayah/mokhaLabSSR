interface CharacterCountProps {
  current: number
  max: number
}

export default function CharacterCount({ current, max }: CharacterCountProps) {
  const isOver = current > max
  return (
    <span
      style={{
        fontSize: "12px",
        color: isOver ? "#d91515" : "#5f6b7a",
      }}
    >
      {current} / {max}
    </span>
  )
}
