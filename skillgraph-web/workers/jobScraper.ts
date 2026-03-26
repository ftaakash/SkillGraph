import axios from 'axios'
import { prisma } from '../lib/prisma'
import { callGPTArray, PROMPTS } from '../lib/openai'
import cron from 'node-cron'

/**
 * Worker 1 — Weekly Job Scraper
 * Runs every Sunday at 00:00 IST
 * Fetches job postings from RapidAPI JSearch, extracts required skills with GPT-4o,
 * and upserts them into the JobPostings table.
 */

const TARGET_ROLES = [
  'Software Development Engineer', 'Data Analyst', 'Machine Learning Engineer',
  'DevOps Engineer', 'Full Stack Developer', 'Cloud Architect',
  'Backend Developer', 'Frontend Developer', 'Data Scientist', 'Product Manager',
]

function getCurrentWeek(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
}

async function fetchJobsForRole(role: string, page: number = 1): Promise<{ title: string; description: string; company: string; location: string }[]> {
  const options = {
    method: 'GET',
    url: `https://${process.env.RAPIDAPI_HOST}/search`,
    params: { query: `${role} India`, page: String(page), num_pages: '1', country: 'in' },
    headers: {
      'x-rapidapi-key': process.env.RAPIDAPI_KEY,
      'x-rapidapi-host': process.env.RAPIDAPI_HOST,
    },
  }
  const response = await axios.request(options)
  return (response.data?.data ?? []).map((job: { job_title: string; job_description: string; employer_name: string; job_city: string }) => ({
    title: job.job_title,
    description: job.job_description?.slice(0, 2000) ?? '',
    company: job.employer_name,
    location: job.job_city ?? 'India',
  }))
}

async function extractSkills(description: string): Promise<string[]> {
  try {
    const raw = await callGPTArray(
      PROMPTS.JD_SKILL_EXTRACTOR,
      `Extract required skills from this job description:\n\n${description}`,
      'llama-3.3-70b-versatile',
      500
    )
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((s: unknown) => typeof s === 'string') : []
  } catch { return [] }
}

export async function runJobScraper() {
  const week = getCurrentWeek()
  console.log(`[JobScraper] Starting — Week ${week}`)

  let totalInserted = 0

  for (const role of TARGET_ROLES) {
    try {
      const jobs = await fetchJobsForRole(role)
      console.log(`[JobScraper] ${role}: ${jobs.length} jobs fetched`)

      for (const job of jobs.slice(0, 30)) { // cap at 30 per role to manage API quota
        const requiredSkills = await extractSkills(job.description)

        await prisma.jobPosting.create({
          data: {
            company: job.company,
            role,
            location: job.location,
            rawDescription: job.description,
            requiredSkills,
            demandWeek: week,
            source: 'linkedin',
          },
        })
        totalInserted++
      }

      // Rate limit: 1 second between roles
      await new Promise(r => setTimeout(r, 1000))
    } catch (err) {
      console.error(`[JobScraper] Error for role ${role}:`, err)
    }
  }

  console.log(`[JobScraper] Done — ${totalInserted} job postings inserted for week ${week}`)
}

