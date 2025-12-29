import { View, Text } from '@react-pdf/renderer';
import { styles } from './manifest-styles';

interface ManifestSignatureSectionProps {
  translations: {
    title: string;
    signatureLine: string;
    printedName: string;
    timeReceived: string;
    driverNotes: string;
  };
}

export function ManifestSignatureSection({ translations }: ManifestSignatureSectionProps) {
  return (
    <View style={styles.signatureSection}>
      <Text style={styles.signatureTitle}>{translations.title}</Text>

      <View style={styles.signatureRow}>
        <View style={styles.signatureField}>
          <Text style={styles.signatureLabel}>{translations.signatureLine}</Text>
          <View style={styles.signatureLine} />
        </View>
        <View style={styles.signatureField}>
          <Text style={styles.signatureLabel}>{translations.printedName}</Text>
          <View style={styles.signatureLine} />
        </View>
      </View>

      <View style={styles.signatureRow}>
        <View style={styles.signatureField}>
          <Text style={styles.signatureLabel}>{translations.timeReceived}</Text>
          <View style={styles.signatureLine} />
        </View>
        <View style={styles.signatureField} />
      </View>

      <View style={styles.notesField}>
        <Text style={styles.signatureLabel}>{translations.driverNotes}</Text>
        <View style={styles.notesLines} />
        <View style={styles.notesLines} />
      </View>
    </View>
  );
}
