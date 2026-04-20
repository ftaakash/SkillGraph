import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToStream, Font } from '@react-pdf/renderer';

// Register fonts if needed, but for simplicity we'll use default fonts inside the styles

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#111' },
  header: { alignItems: 'center', marginBottom: 20 },
  name: { fontSize: 24, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 2 },
  tagline: { fontSize: 11, marginBottom: 4, color: '#333' },
  contact: { flexDirection: 'row', gap: 10, fontSize: 9, color: '#444' },
  
  section: { marginTop: 12 },
  sectionHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderBottomWidth: 1, 
    borderBottomColor: '#003366', 
    paddingBottom: 2, 
    marginBottom: 8 
  },
  sectionTitle: { 
    fontSize: 12, 
    fontWeight: 'bold', 
    color: '#003366', 
    textTransform: 'uppercase',
    marginLeft: 4
  },
  
  entry: { marginBottom: 8 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  entryTitle: { fontSize: 11, fontWeight: 'bold' },
  entrySubTitle: { fontSize: 10, fontStyle: 'italic', color: '#333' },
  entryRight: { fontSize: 9, textAlign: 'right' },
  
  bulletItem: { flexDirection: 'row', marginBottom: 2, marginLeft: 10 },
  bulletPoint: { width: 8, fontSize: 10 },
  bulletText: { flex: 1, lineHeight: 1.3 },
  
  skillItem: { marginBottom: 3 },
  skillLabel: { fontWeight: 'bold' },
});

const ResumeDocument = ({ data }: { data: any }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.name}>{data.name}</Text>
        {data.tagline && <Text style={styles.tagline}>{data.tagline}</Text>}
        <View style={styles.contact}>
          <Text>{data.phone}</Text>
          <Text>•</Text>
          <Text>{data.email}</Text>
          {data.linkedin && <><Text>•</Text><Text>{data.linkedin}</Text></>}
          {data.github && <><Text>•</Text><Text>{data.github}</Text></>}
        </View>
      </View>

      {/* Summary */}
      {data.summary && (
        <View style={styles.section}>
          <Text style={{ lineHeight: 1.4, marginBottom: 5 }}>{data.summary}</Text>
        </View>
      )}

      {/* Education */}
      {data.education && data.education.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Education</Text>
          </View>
          {data.education.map((edu: any, i: number) => (
            <View key={i} style={styles.entry}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryTitle}>{edu.college}</Text>
                <Text style={styles.entryRight}>{edu.location}</Text>
              </View>
              <View style={styles.entryHeader}>
                <Text style={styles.entrySubTitle}>{edu.degree}</Text>
                <Text style={styles.entryRight}>{edu.duration || edu.year}</Text>
              </View>
              {edu.cgpa && <Text style={{ fontSize: 9, marginTop: 1 }}>CGPA: {edu.cgpa}</Text>}
              {edu.bullets?.map((b: string, idx: number) => (
                <View key={idx} style={styles.bulletItem}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={styles.bulletText}>{b}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}

      {/* Experience */}
      {data.experience && data.experience.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Experience</Text>
          </View>
          {data.experience.map((exp: any, i: number) => (
            <View key={i} style={styles.entry}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryTitle}>{exp.company}</Text>
                <Text style={styles.entryRight}>{exp.location}</Text>
              </View>
              <View style={styles.entryHeader}>
                <Text style={styles.entrySubTitle}>{exp.role}</Text>
                <Text style={styles.entryRight}>{exp.duration}</Text>
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
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Projects</Text>
          </View>
          {data.projects.map((proj: any, i: number) => (
            <View key={i} style={styles.entry}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryTitle}>{proj.name} {proj.techStack?.length > 0 && `| ${proj.techStack.join(", ")}`}</Text>
                <Text style={styles.entryRight}>{proj.date || proj.year}</Text>
              </View>
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
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Technical Skills</Text>
          </View>
          {data.skills.technical?.length > 0 && (
            <Text style={styles.skillItem}><Text style={styles.skillLabel}>Proficient in:</Text> {data.skills.technical.join(", ")}</Text>
          )}
          {data.skills.tools?.length > 0 && (
            <Text style={styles.skillItem}><Text style={styles.skillLabel}>Familiar with:</Text> {data.skills.tools.join(", ")}</Text>
          )}
        </View>
      )}

      {/* Honors & Awards */}
      {data.achievements && data.achievements.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Honors & Awards</Text>
          </View>
          {data.achievements.map((ach: string, i: number) => (
            <View key={i} style={styles.bulletItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.bulletText}>{ach}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Organization & Activities */}
      {data.activities && data.activities.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Organization & Activities</Text>
          </View>
          {data.activities.map((act: string, i: number) => (
            <View key={i} style={styles.bulletItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.bulletText}>{act}</Text>
            </View>
          ))}
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
