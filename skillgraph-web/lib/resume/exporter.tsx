import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToStream, Font } from '@react-pdf/renderer';

// Register fonts if needed, but for simplicity we'll use default fonts inside the styles

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 11, fontFamily: 'Helvetica' },
  header: { marginBottom: 15, borderBottom: '1 solid #000', paddingBottom: 10 },
  name: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  contact: { fontSize: 10, color: '#333' },
  summary: { marginBottom: 15, lineHeight: 1.4 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', borderBottom: '1 solid #ccc', marginBottom: 8, marginTop: 15, paddingBottom: 2 },
  subTitle: { fontSize: 12, fontWeight: 'bold' },
  date: { fontSize: 10, color: '#666', textAlign: 'right' },
  flexBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  bulletItem: { flexDirection: 'row', marginBottom: 4 },
  bulletPoint: { width: 10, fontSize: 10 },
  bulletText: { flex: 1, lineHeight: 1.4 }
});

const ResumeDocument = ({ data }: { data: any }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.name}>{data.name || "Student Name"}</Text>
        <Text style={styles.contact}>{data.email || "email@example.com"} • {data.phone || "9999999999"} • LinkedIn / GitHub</Text>
      </View>

      {/* Summary */}
      <View>
        <Text style={styles.summary}>{data.summary}</Text>
      </View>

      {/* Experience */}
      {data.experience && data.experience.length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>EXPERIENCE</Text>
          {data.experience.map((exp: any, i: number) => (
            <View key={i} style={{ marginBottom: 10 }}>
              <View style={styles.flexBetween}>
                <Text style={styles.subTitle}>{exp.role} — {exp.company}</Text>
                <Text style={styles.date}>{exp.duration}</Text>
              </View>
              {exp.bullets.map((b: string, idx: number) => (
                <View key={idx} style={styles.bulletItem}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={styles.bulletText}>{b}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}

      {/* Projects */}
      {data.projects && data.projects.length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>PROJECTS</Text>
          {data.projects.map((proj: any, i: number) => (
            <View key={i} style={{ marginBottom: 10 }}>
              <View style={styles.flexBetween}>
                <Text style={styles.subTitle}>{proj.name}</Text>
                <Text style={styles.date}>{proj.techStack?.join(", ")}</Text>
              </View>
              <Text style={{ fontSize: 10, fontStyle: 'italic', marginBottom: 4 }}>Impact: {proj.impact}</Text>
              {proj.bullets.map((b: string, idx: number) => (
                <View key={idx} style={styles.bulletItem}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={styles.bulletText}>{b}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}

      {/* Skills */}
      {data.skills && (
        <View>
          <Text style={styles.sectionTitle}>SKILLS</Text>
          <Text style={{ marginBottom: 4 }}><Text style={{ fontWeight: 'bold' }}>Technical:</Text> {data.skills.technical?.join(", ")}</Text>
          <Text style={{ marginBottom: 4 }}><Text style={{ fontWeight: 'bold' }}>Tools:</Text> {data.skills.tools?.join(", ")}</Text>
        </View>
      )}

      {/* Education */}
      {data.education && (
        <View>
          <Text style={styles.sectionTitle}>EDUCATION</Text>
          <View style={styles.flexBetween}>
            <Text style={styles.subTitle}>{data.education.degree} — {data.education.college}</Text>
            <Text style={styles.date}>Grad: {data.education.year}</Text>
          </View>
          <Text style={{ fontSize: 10 }}>CGPA: {data.education.cgpa}</Text>
        </View>
      )}

    </Page>
  </Document>
);

/**
 * Returns a Buffer containing the PDF document.
 */
export async function generateResumePDFBuffer(data: any): Promise<Buffer> {
  const stream = await renderToStream(<ResumeDocument data={data} />);
  
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}
