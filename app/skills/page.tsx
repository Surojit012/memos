'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Skill } from '@/lib/types'

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/skills', { cache: 'no-store' }).then(r=>r.json()).then(d=>{setSkills(d.skills??[]);setLoading(false)})
  }, [])

  const cats = ['All', ...Array.from(new Set(skills.map(s=>s.category)))]
  const filtered = filter==='All' ? skills : skills.filter(s=>s.category===filter)

  return (
    <>
      <nav className="nav flex items-center justify-between px-6 lg:px-8 py-4 border-b border-[#2A302C] bg-[rgba(15,18,16,0.9)] backdrop-blur-md sticky top-0 z-50">
        <Link href="/" className="font-display text-xl font-bold text-[#5E7D7E] tracking-tight">
          Memory<span className="text-[#5A6460] font-normal">OS</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm font-medium text-[#8A9490] hover:text-[#F4F1EE] transition-colors">← Home</Link>
          <Link href="/dashboard" className="text-sm font-medium text-[#8A9490] hover:text-[#F4F1EE] transition-colors">Dashboard</Link>
          <Link href="/skills/publish" className="bg-[#5E7D7E] text-white px-5 py-2.5 rounded-full text-sm font-bold transition-all hover:scale-105 hover:bg-[#6E8D8E]">
            + Publish Skill
          </Link>
        </div>
      </nav>
      <div className="page" style={{paddingTop:40,paddingBottom:80}}>
        <div className="mb-12">
          <h1 className="font-display text-4xl lg:text-5xl font-black tracking-tight text-[#F4F1EE] mb-4">Skills Marketplace</h1>
          <p className="text-[#8A9490] text-lg max-w-2xl leading-relaxed">Buy and sell AI capabilities. Agents pay agents. Powered by 0G Chain.</p>
        </div>
        <div className="flex gap-2 flex-wrap mb-10">
          {cats.map(c=>(
            <button key={c} className={`px-5 py-2 rounded-xl transition-all font-mono text-xs border ${filter===c?'bg-[#5E7D7E] text-white border-[#5E7D7E] shadow-lg shadow-[#5E7D7E]/10':'bg-[#151A17] text-[#5A6460] border-[#2A302C] hover:border-[#3D4540] hover:text-[#8A9490]'}`} onClick={()=>setFilter(c)}>
              {c}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="empty"><div className="spinner" style={{width:28,height:28,margin:'0 auto'}}/></div>
        ) : (
          <div className="skills-grid">
            {filtered.map(skill=>(
              <Link key={skill.id} href={`/skills/${skill.id}`} className="skill-card">
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span className="skill-category px-3 py-1 rounded-lg bg-[#8B6F66]/10 text-[#8B6F66] border border-[#8B6F66]/20 font-mono text-[10px] uppercase tracking-wider">{skill.category}</span>
                  <span className="skill-price font-mono font-bold text-sm" style={{color: parseFloat(skill.price) === 0 ? '#7A9E8E' : '#5E7D7E'}}>
                    {parseFloat(skill.price) === 0 ? 'Free' : `${skill.price} OG`}
                  </span>
                </div>
                <div className="skill-name">{skill.name}</div>
                <div className="skill-desc">{skill.description}</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:4}}>{skill.tags.map(t=><span key={t} className="skill-tag">#{t}</span>)}</div>
                <div className="skill-footer">
                  <span>by {skill.publisherName}</span>
                  <span>{skill.usageCount} runs · {skill.totalEarned.toFixed(4)} OG earned</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
