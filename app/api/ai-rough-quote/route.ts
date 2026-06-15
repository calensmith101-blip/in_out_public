import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const disclaimer = 'Please note: this is a rough quote prepared with AI assistance based on the information provided. Final pricing may vary depending on access, materials, job scope, and anything found on inspection. You will be informed of any changes before work begins or before any additional work is carried out.'

type Complexity = 'Small' | 'Medium' | 'Large' | 'Specialist'
type EstimateBand = {
  lowHours: number
  highHours: number
  materialLow: number
  materialHigh: number
  complexity: Complexity
  category: string
}

type TradePlan = {
  scope: string
  materials: string[]
  questions: string[]
  risks: string[]
  labourSteps: string[]
}

function normalise(input: unknown) {
  return String(input || '').toLowerCase().trim()
}

function titleCase(input: unknown) {
  const text = String(input || '').trim()
  if (!text) return ''
  return text.replace(/\w\S*/g, word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
}

function cleanJobName(body: any) {
  return titleCase(body.jobType || body.description?.slice(0, 55) || 'property maintenance job')
}

function includes(text: string, words: string[]) {
  return words.some(word => text.includes(word))
}

function getEstimateBand(body: any): EstimateBand {
  const text = `${normalise(body.jobType)} ${normalise(body.description)} ${normalise(body.photoNote)} ${normalise(body.address)}`

  const rules: Array<{ name: string; match: RegExp; band: Omit<EstimateBand, 'category'> }> = [
    { name: 'Window / glass / screen repair', match: /window|glass|glazing|flyscreen|fly screen|security screen|sliding window|sash/, band: { lowHours: 2, highHours: 7, materialLow: 80, materialHigh: 650, complexity: 'Specialist' } },
    { name: 'Door / lock / hinge repair', match: /door|lock|handle|hinge|latch|strike plate|privacy set|entry set|sliding door/, band: { lowHours: 1, highHours: 4, materialLow: 25, materialHigh: 250, complexity: 'Small' } },
    { name: 'Irrigation', match: /irrigation|sprinkler|solenoid|controller|retic|drip|poly pipe|popup|pop up|watering system/, band: { lowHours: 3, highHours: 8, materialLow: 80, materialHigh: 450, complexity: 'Specialist' } },
    { name: 'CCTV / security', match: /cctv|camera|alarm|security|sensor|pir|reed|keypad|siren|dvr|nvr/, band: { lowHours: 2.5, highHours: 7, materialLow: 50, materialHigh: 350, complexity: 'Specialist' } },
    { name: 'AV / data / TV', match: /tv mount|television|projector|speaker|home theatre|antenna|data point|ethernet|cat6|av rack|hdmi/, band: { lowHours: 1.5, highHours: 5, materialLow: 30, materialHigh: 250, complexity: 'Specialist' } },
    { name: 'Gardening / yard clean-up', match: /garden|gardening|weeding|weed|mowing|lawn|hedge|prun|green waste|yard|clean ?up|cleanup|mulch|tree|shrub/, band: { lowHours: 1.5, highHours: 7, materialLow: 15, materialHigh: 180, complexity: 'Medium' } },
    { name: 'Fence / gate / deck / outdoor structure', match: /fence|gate|deck|retaining|concrete|paving|screen|pergola|post|rail/, band: { lowHours: 4, highHours: 14, materialLow: 120, materialHigh: 900, complexity: 'Large' } },
    { name: 'Painting / patching / plaster', match: /paint|painting|plaster|gyprock|patch|hole|crack|cornice|skirting|wall repair/, band: { lowHours: 2, highHours: 8, materialLow: 40, materialHigh: 300, complexity: 'Medium' } },
    { name: 'Silicone / wet area maintenance', match: /silicone|caulk|sealant|grout|shower screen|bath|vanity|waterproof|mould/, band: { lowHours: 1.5, highHours: 5, materialLow: 30, materialHigh: 180, complexity: 'Medium' } },
    { name: 'Flat pack / furniture / shelving', match: /flat pack|flatpack|furniture|assemble|assembly|shelf|shelving|cabinet|cupboard|wardrobe|desk/, band: { lowHours: 1.5, highHours: 6, materialLow: 10, materialHigh: 120, complexity: 'Small' } },
    { name: 'Gutters / roofline maintenance', match: /gutter|downpipe|fascia|eave|roof leak|roofline|leaf guard/, band: { lowHours: 2, highHours: 7, materialLow: 30, materialHigh: 320, complexity: 'Medium' } },
    { name: 'Cleaning / pressure washing / rubbish', match: /pressure wash|wash down|cleaning|rubbish|junk|tip run|remove waste|dump|clear out/, band: { lowHours: 1.5, highHours: 6, materialLow: 20, materialHigh: 220, complexity: 'Medium' } },
    { name: 'General repair / installation', match: /repair|replace|install|fix|mount|fit|adjust|maintenance|handyman/, band: { lowHours: 1.5, highHours: 5, materialLow: 35, materialHigh: 260, complexity: 'Medium' } },
    { name: 'High-risk / licensed trade check', match: /bathroom|kitchen|renovat|water damage|leak|roof|structural|electrical|plumbing|gas|switchboard|power point/, band: { lowHours: 3, highHours: 10, materialLow: 80, materialHigh: 650, complexity: 'Specialist' } },
  ]

  const matched = rules.find(rule => rule.match.test(text))
  let band: EstimateBand = matched
    ? { ...matched.band, category: matched.name }
    : { lowHours: 1.5, highHours: 5, materialLow: 35, materialHigh: 260, complexity: 'Medium', category: cleanJobName(body) }

  const photoCount = Number(body.photoCount || 0)
  if (photoCount >= 3) band = { ...band, highHours: band.highHours + 0.75 }
  if (/urgent|asap|same day|after hours|weekend|unsafe|leaking|broken|not working|failed|stuck/.test(text)) {
    band = { ...band, highHours: band.highHours + 1.5, materialHigh: band.materialHigh + 90 }
  }
  if (/multiple|several|whole|full|large|big|entire|all|four|five|six|7|8|9|10/.test(text)) {
    band = { ...band, lowHours: band.lowHours + 0.75, highHours: band.highHours + 4, materialHigh: band.materialHigh + 220, complexity: band.complexity === 'Small' ? 'Medium' : band.complexity }
  }
  if (/just|small|quick|minor|single|one |tighten|adjust/.test(text)) {
    band = { ...band, highHours: Math.max(band.lowHours + 1, band.highHours - 1), materialHigh: Math.max(band.materialLow + 40, band.materialHigh - 90) }
  }

  return band
}

function getTradePlan(body: any, band: EstimateBand): TradePlan {
  const text = `${normalise(body.jobType)} ${normalise(body.description)} ${normalise(body.photoNote)}`
  const jobName = cleanJobName(body)
  const location = body.address ? ` at ${body.address}` : ''

  if (/window|glass|glazing|flyscreen|fly screen|security screen|sliding window|sash/.test(text)) {
    return {
      scope: `Attend site${location}, inspect and measure the window/screen area, safely remove failed or damaged sections where practical, source or fit suitable replacement parts/materials, seal/tidy the area and confirm smooth operation/weather protection.`,
      labourSteps: ['Confirm measurements and frame condition', 'Remove damaged glass/screen/trim as required', 'Fit replacement or prepare measurements for supplier', 'Clean up and test operation'],
      materials: ['Glass/screen mesh or replacement panel allowance', 'Beading/spline/sealant/fixings', 'Disposal of damaged material if required', 'Consumables'],
      questions: ['Is it glass, flyscreen, frame, lock or sliding mechanism?', 'Can you send width/height measurements?', 'Is the glass cracked/broken or only the screen damaged?', 'Is it ground floor and easy to access?'],
      risks: ['Exact glass type/size may require supplier pricing', 'Rotten/damaged frames can add labour', 'Safety glass or custom glazing may need a glazier'],
    }
  }

  if (/door|lock|handle|hinge|latch|strike plate|privacy set|entry set|sliding door/.test(text)) {
    return {
      scope: `Inspect the door/lock/hinge issue${location}, adjust alignment where possible, replace worn hardware if required, test latch/lock operation and leave the door safe and usable.`,
      labourSteps: ['Check door alignment and frame movement', 'Tighten/replace hinges or handle hardware', 'Adjust strike/latch', 'Test opening, closing and locking'],
      materials: ['Hinges/handle/latch/strike plate allowance', 'Screws/packers/fixings', 'Lubricant and consumables'],
      questions: ['Is it internal, external or sliding?', 'Does it not close, not lock, scrape, sag or stick?', 'Do you want matching hardware supplied?', 'Can you send photos of both sides and the latch area?'],
      risks: ['Swollen frames or structural movement may require extra work', 'Special locks/hardware may need ordering', 'Security doors may need specialist parts'],
    }
  }

  if (/irrigation|sprinkler|solenoid|controller|retic|drip|poly pipe|popup|pop up|watering system/.test(text)) {
    return {
      scope: `Diagnose and repair or install the requested irrigation components${location}, test water pressure/coverage, check controller/valves where applicable, replace faulty heads/fittings as confirmed and leave zones operating correctly.`,
      labourSteps: ['Locate valves/controller/fault area', 'Pressure test affected zone/s', 'Repair pipe/fittings/heads or replace confirmed failed parts', 'Run each zone and adjust spray coverage'],
      materials: ['Poly pipe/fittings/risers/nozzles', 'Sprinkler heads or drip components if required', 'Solenoid/controller parts only if confirmed faulty', 'Consumables and waterproof connectors'],
      questions: ['How many stations/zones are affected?', 'Is it a leak, no water, poor coverage or controller fault?', 'Do you know where the valves are?', 'Can you send photos of controller/valves/broken area?'],
      risks: ['Hidden pipe damage or roots may increase labour', 'Electrical/controller faults may need parts', 'Poor access or buried valves can add time'],
    }
  }

  if (/cctv|camera|alarm|security|sensor|pir|reed|keypad|siren|dvr|nvr/.test(text)) {
    return {
      scope: `Inspect existing/security equipment requirements${location}, confirm cable routes and device positions, install or troubleshoot requested devices, test recording/app/network operation and show the client basic use.`,
      labourSteps: ['Confirm device count and mounting positions', 'Check roof/cable/network access', 'Install or troubleshoot devices/cabling', 'Test app/viewing/recording and handover'],
      materials: ['Cable/connectors/fixings allowance', 'Mounting hardware', 'Patch leads/power/network accessories', 'Replacement device allowance only if confirmed'],
      questions: ['How many cameras/devices are involved?', 'Do you already have the equipment?', 'Is roof access available?', 'Do you need app setup/remote viewing included?'],
      risks: ['Roof access/cable paths can change labour', 'Network/password issues may slow setup', 'Faulty supplied equipment is not included unless confirmed'],
    }
  }

  if (/tv mount|television|projector|speaker|home theatre|antenna|data point|ethernet|cat6|av rack|hdmi/.test(text)) {
    return {
      scope: `Install, mount, connect or troubleshoot the requested AV/data equipment${location}, tidy or conceal cabling where practical, configure basic settings and test operation before leaving.`,
      labourSteps: ['Check wall type/equipment/brackets', 'Mount or connect gear safely', 'Run/tidy cabling where practical', 'Test source, sound, network and remote/app control'],
      materials: ['Cable/connectors/fixings', 'Wall plates/brackets if required', 'HDMI/data/speaker leads if not supplied', 'Consumables'],
      questions: ['Do you have the bracket/equipment already?', 'What wall type is it going on?', 'Do you want cables hidden?', 'Are power/data points already nearby?'],
      risks: ['Brick/stud/gyprock walls change method', 'Cable concealment can add time', 'Extra brackets/cables may be required'],
    }
  }

  if (/garden|gardening|weeding|weed|mowing|lawn|hedge|prun|green waste|yard|clean ?up|cleanup|mulch|tree|shrub/.test(text)) {
    return {
      scope: `Complete the garden/property tidy-up${location} within the agreed areas, including cutting back, weeding, mowing or clean-up as described, then tidy paths/edges and remove or pile green waste as agreed.`,
      labourSteps: ['Walk through areas and confirm priorities', 'Cut/weed/mow/prune agreed sections', 'Bag/pile/remove green waste as agreed', 'Final tidy/blow down'],
      materials: ['Green waste disposal allowance if required', 'Consumables/fuel allowance', 'Weed treatment only if requested', 'Bags/ties if needed'],
      questions: ['Can you send photos of the whole area?', 'Do you need green waste removed?', 'Is there side/rear access?', 'How high/overgrown is it?'],
      risks: ['Heavy overgrowth or hidden rubbish may add time', 'Green waste volume affects disposal cost', 'Weather can affect booking/timing'],
    }
  }

  if (/fence|gate|deck|retaining|concrete|paving|screen|pergola|post|rail/.test(text)) {
    return {
      scope: `Inspect and measure the outdoor repair/replacement work${location}, remove failed sections where needed, supply or fit suitable materials, secure fixings and leave the area safe/tidy.`,
      labourSteps: ['Measure and confirm materials/style', 'Remove or repair failed sections', 'Fit new timber/hardware/concrete/fixings as required', 'Check alignment/strength and clean up'],
      materials: ['Timber/posts/rails/hardware allowance', 'Concrete/fixings/brackets if required', 'Removal/disposal allowance', 'Consumables'],
      questions: ['Can you send measurements and photos?', 'Is it repair only or replacement?', 'What material/style do you want?', 'Does old material need removal?'],
      risks: ['Material prices can vary strongly', 'Rot/hidden damage may increase scope', 'Structural work may need approval/licensed trade'],
    }
  }

  if (/paint|painting|plaster|gyprock|patch|hole|crack|cornice|skirting|wall repair/.test(text)) {
    return {
      scope: `Prepare and repair the affected surface${location}, patch/fill/sand as required, apply suitable primer/paint where included, and leave the area neat.`,
      labourSteps: ['Inspect damage and surrounding surface', 'Patch/fill/sand/prep area', 'Prime/paint touch-up if included', 'Clean up dust and materials'],
      materials: ['Filler/plaster/compound/sandpaper', 'Primer/paint allowance if required', 'Drop sheets/tape/consumables'],
      questions: ['How large is the damaged area?', 'Do you have matching paint?', 'Is it one coat/touch-up or full wall?', 'Can you send photos in good light?'],
      risks: ['Paint matching may not be exact', 'Drying time can require return visit', 'Water damage/mould may need further repair'],
    }
  }

  if (/silicone|caulk|sealant|grout|shower screen|bath|vanity|waterproof|mould/.test(text)) {
    return {
      scope: `Remove failed sealant/grout where required${location}, clean and prepare the joint/surface, apply new suitable sealant or minor grout repair, and advise on curing time before use.`,
      labourSteps: ['Remove old loose/mouldy sealant', 'Clean/degrease/dry joint', 'Apply new silicone/sealant neatly', 'Final clean and curing advice'],
      materials: ['Bathroom/kitchen grade silicone or sealant', 'Cleaner/mould treatment if required', 'Scrapers/tape/consumables'],
      questions: ['Which area needs resealing?', 'Is there active leaking?', 'How long is the joint/area?', 'Can it stay dry before and after the job?'],
      risks: ['Hidden water damage may need further work', 'Wet areas may need drying before sealing', 'Waterproofing defects are outside minor sealant repair'],
    }
  }

  const described = body.description ? `: ${String(body.description).trim()}` : ''
  return {
    scope: `Attend site${location} to inspect and complete the ${jobName}${described}. Confirm the exact scope, access and measurements on arrival, complete the agreed handyman/property maintenance work, supply minor materials where required and leave the work area tidy.`,
    labourSteps: ['Confirm scope, measurements and access', 'Protect nearby areas where needed', 'Complete the agreed repair/install/maintenance work', 'Test/check finished work and clean up'],
    materials: [`Materials/parts specifically required for ${jobName}`, 'Fixings/fasteners/sealants or consumables as needed', 'Replacement parts only once confirmed', 'Waste/disposal allowance if required'],
    questions: ['Can you send clear photos from a few angles?', 'Do you have measurements or model/part details?', 'Is access easy and is parking available?', 'Is this urgent or can it be booked normally?'],
    risks: ['Hidden damage, poor access or extra parts may change the final price', 'Any licensed electrical/plumbing/gas/structural work may need a licensed trade', 'Final scope will be confirmed before extra work is carried out'],
  }
}

function buildDraft(body: any, aiDraft?: any) {
  const hourlyRate = Number(body.hourlyRate || 70)
  const travelCharge = Number(body.travelCharge || 0)
  const materialMarkup = Number(body.materialMarkup || 0)
  const band = getEstimateBand(body)
  const lowMaterials = Math.round(band.materialLow * (1 + materialMarkup / 100))
  const highMaterials = Math.round(band.materialHigh * (1 + materialMarkup / 100))
  const contingencyLow = Math.round((band.lowHours * hourlyRate + lowMaterials) * 0.05)
  const contingencyHigh = Math.round((band.highHours * hourlyRate + highMaterials) * 0.12)
  const priceLow = Math.round(band.lowHours * hourlyRate + lowMaterials + travelCharge + contingencyLow)
  const priceHigh = Math.round(band.highHours * hourlyRate + highMaterials + travelCharge + contingencyHigh)
  const photoCount = Number(body.photoCount || 0)
  const plan = getTradePlan(body, band)
  const jobName = cleanJobName(body)
  const suppliedInfo = [body.description, body.photoNote].filter(Boolean).join(' ')

  const fallback = {
    scope: `${plan.scope}${photoCount ? ` I have ${photoCount} photo${photoCount === 1 ? '' : 's'} to reference, but final pricing still depends on site access and confirmed measurements.` : ''}`,
    complexity: band.complexity,
    category: band.category,
    labourHoursLow: band.lowHours,
    labourHoursHigh: band.highHours,
    materials: plan.materials,
    labourSteps: plan.labourSteps,
    lineItems: [
      { item: `Labour - ${band.category}`, qty: `${band.lowHours}-${band.highHours} hrs`, rate: hourlyRate, low: Math.round(band.lowHours * hourlyRate), high: Math.round(band.highHours * hourlyRate) },
      { item: `Materials / parts allowance - ${jobName}`, qty: '1', rate: lowMaterials, low: lowMaterials, high: highMaterials },
      { item: 'Travel / call-out allowance', qty: '1', rate: travelCharge, low: travelCharge, high: travelCharge },
      { item: 'Contingency / unknowns', qty: '1', rate: contingencyLow, low: contingencyLow, high: contingencyHigh },
    ],
    questions: plan.questions,
    risks: plan.risks,
    priceLow,
    priceHigh,
    clientMessage: `Thanks for sending through the details${body.customerName ? `, ${body.customerName}` : ''}. For ${jobName.toLowerCase()}, based on the information supplied${suppliedInfo ? ` (${suppliedInfo.slice(0, 140)}${suppliedInfo.length > 140 ? '…' : ''})` : ''}, I would allow roughly ${band.lowHours}-${band.highHours} hours plus materials/parts as required. A rough estimate is around $${priceLow.toFixed(2)} to $${priceHigh.toFixed(2)}. I can firm this up once access, measurements and photos are confirmed. ${disclaimer}`,
    disclaimer,
  }

  const merged = { ...fallback, ...(aiDraft || {}) }
  return {
    ...merged,
    priceLow,
    priceHigh,
    labourHoursLow: band.lowHours,
    labourHoursHigh: band.highHours,
    lineItems: fallback.lineItems,
    complexity: band.complexity,
    category: band.category,
    disclaimer,
  }
}

export async function POST(req: Request) {
  const body = await req.json()
  const fallback = buildDraft(body)

  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ ...fallback, aiMode: 'smart-estimator-no-api-key' })

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are an experienced South Australian handyman/property maintenance quoting assistant. Create a practical rough quote draft that is specific to the actual job details. Never reuse generic wording. Do not invent final prices. Do mention likely labour stages, likely materials/parts, access issues, measurements required, risks/unknowns, and what must be confirmed before the quote is firm. Flag electrical/plumbing/gas/structural/unsafe work that may need a licensed trade. Return JSON only with: scope, materials array, questions array, risks array, labourSteps array, clientMessage. Do not return priceLow, priceHigh, labourHoursLow, labourHoursHigh or lineItems because the app calculates those.' },
        { role: 'user', content: JSON.stringify({ customer: body.customerName, address: body.address, jobType: body.jobType, description: body.description, photoNote: body.photoNote, photoCount: body.photoCount, photoNames: body.photoNames, appCalculatedEstimate: fallback, disclaimer }) },
      ],
    })
    const text = completion.choices[0]?.message?.content || '{}'
    return NextResponse.json({ ...buildDraft(body, JSON.parse(text)), aiMode: 'openai' })
  } catch (err: any) {
    return NextResponse.json({ ...fallback, aiMode: 'smart-estimator-api-failed', error: err.message }, { status: 200 })
  }
}
