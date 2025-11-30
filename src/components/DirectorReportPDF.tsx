import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

// Define styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#112244',
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#112244',
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 5,
  },
  section: {
    margin: 10,
    padding: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#112244',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingBottom: 5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  card: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    padding: 10,
    margin: '1%',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  cardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  highlightCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
  },
  highlightValue: {
    color: '#16A34A',
  },
  blueCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
  },
  blueValue: {
    color: '#2563EB',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rowLabel: {
    fontSize: 12,
    color: '#374151',
  },
  rowValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 10,
    color: '#9CA3AF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 10,
  },
});

interface MonthlySummary {
  reportCount: number;
  groupCount: number;
  totalMembers: number;
  totalAttendance: number;
  totalSavings: number;
  ascaCount: number;
  roscaCount: number;
  simpleCount: number;
  youthCount: number;
  totalMen: number;
  totalWomen: number;
  totalChildren: number;
  savingsByType: {
    Asca: number;
    Rosca: number;
    Simple: number;
    youth: number;
  };
}

interface DirectorReportPDFProps {
  monthlySummary: MonthlySummary;
  month: string;
  year: number;
  country: string;
  directorName: string;
}

export const DirectorReportPDF: React.FC<DirectorReportPDFProps> = ({
  monthlySummary,
  month,
  year,
  country,
  directorName,
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Reporte Mensual</Text>
          <Text style={styles.subtitle}>Open Hands</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 12, color: '#374151' }}>{directorName}</Text>
          <Text style={{ fontSize: 12, color: '#374151' }}>{country}</Text>
          <Text style={{ fontSize: 12, color: '#6B7280' }}>{month} {year}</Text>
        </View>
      </View>

      {/* General Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resumen General</Text>
        <View style={styles.grid}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Reportes</Text>
            <Text style={styles.cardValue}>{monthlySummary.reportCount}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Grupos</Text>
            <Text style={styles.cardValue}>{monthlySummary.groupCount}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Total Miembros</Text>
            <Text style={styles.cardValue}>{monthlySummary.totalMembers}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Promedio Asistencia</Text>
            <Text style={styles.cardValue}>{monthlySummary.totalAttendance}</Text>
          </View>
          <View style={[styles.card, styles.highlightCard, { width: '98%' }]}>
            <Text style={styles.cardLabel}>Total Ahorrado</Text>
            <Text style={[styles.cardValue, styles.highlightValue, { fontSize: 24 }]}>
              ${monthlySummary.totalSavings.toLocaleString('es-CO')}
            </Text>
          </View>
        </View>
      </View>

      {/* Group Types & Demographics */}
      <View style={{ flexDirection: 'row' }}>
        {/* Group Types */}
        <View style={[styles.section, { width: '50%' }]}>
          <Text style={styles.sectionTitle}>Tipos de Grupo</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>ASCA</Text>
            <Text style={styles.rowValue}>{monthlySummary.ascaCount}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>ROSCA</Text>
            <Text style={styles.rowValue}>{monthlySummary.roscaCount}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Simple</Text>
            <Text style={styles.rowValue}>{monthlySummary.simpleCount}</Text>
          </View>
          <View style={[styles.row, { borderBottomWidth: 0, marginTop: 5, backgroundColor: '#EFF6FF', padding: 5, borderRadius: 3 }]}>
            <Text style={[styles.rowLabel, { color: '#2563EB' }]}>Juveniles</Text>
            <Text style={[styles.rowValue, { color: '#2563EB' }]}>{monthlySummary.youthCount}</Text>
          </View>
        </View>

        {/* Demographics */}
        <View style={[styles.section, { width: '50%' }]}>
          <Text style={styles.sectionTitle}>Demografía</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Hombres</Text>
            <Text style={styles.rowValue}>{monthlySummary.totalMen}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Mujeres</Text>
            <Text style={styles.rowValue}>{monthlySummary.totalWomen}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Niños/as</Text>
            <Text style={styles.rowValue}>{monthlySummary.totalChildren}</Text>
          </View>
        </View>
      </View>

      {/* Savings Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ahorro por Tipo</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Grupos ASCA</Text>
          <Text style={[styles.rowValue, styles.highlightValue]}>
            ${monthlySummary.savingsByType.Asca.toLocaleString('es-CO')}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Grupos ROSCA</Text>
          <Text style={[styles.rowValue, styles.highlightValue]}>
            ${monthlySummary.savingsByType.Rosca.toLocaleString('es-CO')}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Grupos Simple</Text>
          <Text style={[styles.rowValue, styles.highlightValue]}>
            ${monthlySummary.savingsByType.Simple.toLocaleString('es-CO')}
          </Text>
        </View>
        <View style={[styles.row, { borderBottomWidth: 0, marginTop: 5 }]}>
          <Text style={[styles.rowLabel, styles.blueValue]}>Grupos Juveniles</Text>
          <Text style={[styles.rowValue, styles.blueValue]}>
            ${monthlySummary.savingsByType.youth.toLocaleString('es-CO')}
          </Text>
        </View>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        Generado el {new Date().toLocaleDateString('es-CO')} - Open Hands
      </Text>
    </Page>
  </Document>
);
