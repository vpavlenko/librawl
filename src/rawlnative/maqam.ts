/** The scale-guide tonic offset, measured in semitones from the scale's first degree. */
export function maqamTonicOffset(name: string): number {
  switch (name.trim().toLowerCase()) {
    case 'huzzam':
    case 'huzam':
    case 'sikah':
    case 'rahat al-arwah':
      return 3.5;
    default:
      return 0;
  }
}
