/**
 * The sizes we typically use are 58.35mm and 53.35mm
 */
export type PortafilterSize = 53 | 54 | 58

export interface Machine {
  name: string
  size: PortafilterSize
}

export const machines: Machine[] = [
  // 54mm
  { name: "Breville Bambino", size: 54 },
  { name: "Breville Bambino Plus", size: 54 },
  { name: "Breville Barista Express", size: 54 },
  { name: "Breville Barista Pro", size: 54 },
  { name: "Breville Barista Touch", size: 54 },
  { name: "Breville Infuser", size: 54 },
  { name: "Breville Duo Temp Pro", size: 54 },
  { name: "Solis Barista Perfetta Plus", size: 54 },
  // 53mm
  { name: "La Spaziale LUCCA A53 Mini", size: 53 },
  { name: "La Spaziale Vivaldi II", size: 53 },
  { name: "La Spaziale Mini Vivaldi II", size: 53 },
  { name: "La Spaziale S1 Dream", size: 53 },
  // 58mm
  { name: "Gaggia Classic Pro", size: 58 },
  { name: "Rancilio Silvia", size: 58 },
  { name: "Breville Dual Boiler", size: 58 },
  { name: "Profitec Go", size: 58 },
  { name: "Lelit Bianca V3", size: 58 },
  { name: "Lelit Mara X", size: 58 },
  { name: "Rocket Appartamento", size: 58 },
  { name: "La Marzocco Linea Micra", size: 58 },
  { name: "La Marzocco Linea Mini", size: 58 },
  { name: "ECM Synchronika", size: 58 },
  { name: "Decent Espresso DE1", size: 58 },
  { name: "Turin Legato", size: 58 },
]

export function getMachinesBySize(size: PortafilterSize): string[] {
  return machines.filter((m) => m.size === size).map((m) => m.name)
}

export const machines53 = getMachinesBySize(53)
export const machines54 = getMachinesBySize(54)
export const machines58 = getMachinesBySize(58)
export const machines53and54 = [...getMachinesBySize(53), ...getMachinesBySize(54)]
