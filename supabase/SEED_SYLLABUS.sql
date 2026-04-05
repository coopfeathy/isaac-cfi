-- ======================================================
-- FAA Part 61 Private Pilot Syllabus — Seed Data
-- ======================================================
-- USAGE:
--   1. Replace '<YOUR_COURSE_ID>' with your course UUID
--   2. Replace '<YOUR_INSTRUCTOR_ID>' with the instructor's auth.users UUID
--   3. Run this against your Supabase database
--
-- EXAMPLE:
--   v_course_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
--   v_instructor_id UUID := '12345678-abcd-ef01-2345-6789abcdef01';
-- ======================================================

DO $$
DECLARE
  v_course_id UUID := '44bc1941-a9c5-4927-87c9-1689dadcb131';
  v_instructor_id UUID := 'edee8b09-ceb1-4e61-ba2b-5f5f36eee9e5';
BEGIN
  INSERT INTO syllabus_lessons (
    course_id, lesson_number, title, description, stage,
    ground_topics, flight_maneuvers, completion_standards,
    order_index, created_by
  ) VALUES

  -- =====================================================
  -- PRE-SOLO STAGE (Lessons 1–15)
  -- =====================================================

  (
    v_course_id, 1,
    'Introduction to Flight',
    'Orientation to the aircraft, cockpit environment, and basic flight controls. Student experiences straight-and-level flight, gentle turns, and climbs/descents.',
    'pre-solo',
    '["Aircraft components and systems", "Cockpit familiarization and instrument scan", "Flight controls — ailerons, elevator, rudder", "Preflight inspection procedures", "Safety briefing and emergency egress"]',
    '["Straight-and-level flight", "Gentle turns (15° bank)", "Climbs and descents", "Use of trim"]',
    'Student can identify major aircraft components, complete a preflight inspection with guidance, and maintain approximate straight-and-level flight with minimal instructor input.',
    1, v_instructor_id
  ),

  (
    v_course_id, 2,
    'Four Fundamentals of Flight',
    'Master the four fundamentals — straight-and-level, turns, climbs, and descents — with emphasis on coordinated flight and trim usage.',
    'pre-solo',
    '["Principles of flight — lift, weight, thrust, drag", "Axes of rotation — longitudinal, lateral, vertical", "Trim and its effect on control pressures", "Coordinated flight and the slip/skid ball", "Load factor in turns"]',
    '["Straight-and-level flight (±100 ft, ±10°)", "Medium-bank turns (30°)", "Climbs at Vy", "Descents at cruise and approach speed", "Coordinated flight using rudder"]',
    'Student maintains altitude ±200 ft, heading ±20°, and airspeed ±10 kts during basic maneuvers. Demonstrates coordinated use of controls.',
    2, v_instructor_id
  ),

  (
    v_course_id, 3,
    'Slow Flight and Stalls',
    'Introduction to flight at critically slow airspeeds and stall recognition, entry, and recovery techniques.',
    'pre-solo',
    '["Aerodynamics of slow flight", "Angle of attack and critical angle of attack", "Stall recognition — buffet, mushy controls, aural warning", "Power-on vs power-off stall scenarios", "Stall/spin awareness and prevention"]',
    '["Maneuvering during slow flight (Vs + 5–10 kts)", "Power-off stalls (approach configuration)", "Power-on stalls (departure configuration)", "Stall recovery — reduce AOA, add power, level wings"]',
    'Student recognizes imminent stall indications and recovers with minimal altitude loss (<100 ft). Maintains heading ±10° during slow flight and performs coordinated stall entries/recoveries.',
    3, v_instructor_id
  ),

  (
    v_course_id, 4,
    'Ground Reference Maneuvers',
    'Develop the ability to maintain a ground track while compensating for wind drift using turns around a point, rectangular course, and S-turns.',
    'pre-solo',
    '["Wind drift and ground track correction", "Pilotage — visual reference to ground features", "Relationship between bank angle and wind correction", "Selecting suitable ground reference points", "Collision avoidance and clearing turns"]',
    '["Turns around a point", "Rectangular course", "S-turns across a road", "Wind drift correction techniques"]',
    'Student maintains constant radius during turns around a point (±100 ft altitude) and demonstrates consistent ground track during rectangular course and S-turns with appropriate wind correction.',
    4, v_instructor_id
  ),

  (
    v_course_id, 5,
    'Airport Operations',
    'Learn airport markings, taxi procedures, radio communications, and traffic pattern operations including normal takeoffs and landings.',
    'pre-solo',
    '["Airport markings — runway, taxiway, hold short lines", "Taxiway signs and surface markings", "ATC communications fundamentals", "Traffic pattern — upwind, crosswind, downwind, base, final", "Right-of-way rules and collision avoidance"]',
    '["Taxi procedures with proper wind correction", "Normal takeoff", "Traffic pattern entry and exit", "Normal approach and landing", "Go-around procedures"]',
    'Student demonstrates proper taxi technique, communicates with ATC or announces on CTAF, flies the traffic pattern at correct altitudes and positions, and completes normal landings with safe touchdowns within the first third of the runway.',
    5, v_instructor_id
  ),

  (
    v_course_id, 6,
    'Normal and Crosswind Takeoffs',
    'Develop proficiency in normal and crosswind takeoff techniques, including proper use of flight controls during the ground roll and initial climb.',
    'pre-solo',
    '["Crosswind component calculation", "Takeoff technique — ground roll, rotation, initial climb", "Vr, Vx, and Vy speeds", "Crosswind correction during takeoff roll", "Departure procedures and obstacle clearance"]',
    '["Normal takeoff with proper rotation speed", "Crosswind takeoff with aileron correction", "Departure climb at Vy", "Obstacle clearance climb at Vx"]',
    'Student performs takeoffs maintaining centerline within ±5 ft, rotates at appropriate speed, applies crosswind correction, and tracks runway heading during climb-out within ±10°.',
    6, v_instructor_id
  ),

  (
    v_course_id, 7,
    'Normal and Crosswind Landings',
    'Practice normal and crosswind landing techniques including approach speed management, flap configuration, and go-around decision-making.',
    'pre-solo',
    '["Approach speed calculation (1.3 × Vso)", "Flap configuration and approach stabilization", "Crosswind correction methods — crab vs side-slip", "Aiming point and touchdown zone", "Go-around decision-making and execution"]',
    '["Normal approach and landing", "Crosswind approach and landing (wing-low method)", "Go-around from various points on approach", "Flap management during approach"]',
    'Student lands within 400 ft of a designated point, maintains directional control throughout the flare and rollout, correctly applies crosswind correction, and executes a go-around promptly when warranted.',
    7, v_instructor_id
  ),

  (
    v_course_id, 8,
    'Emergency Procedures',
    'Introduction to handling in-flight emergencies including engine failure, electrical failure, and forced landing procedures.',
    'pre-solo',
    '["Engine failure checklist — troubleshoot, restart, secure", "Emergency landing site selection (fields, roads)", "Emergency descent techniques", "Electrical fire and in-flight fire procedures", "Emergency communications — 121.5 MHz, squawk 7700"]',
    '["Simulated engine failure in the pattern", "Simulated engine failure from cruise altitude", "Emergency descent", "Forced landing approach (power-off 180°)", "Best glide speed maintenance"]',
    'Student demonstrates the ability to maintain best glide speed (±5 kts), select a suitable landing site, complete the emergency checklist from memory, and fly a stabilized approach to the chosen field.',
    8, v_instructor_id
  ),

  (
    v_course_id, 9,
    'Short-Field and Soft-Field Operations',
    'Master takeoff and landing techniques for short and soft-field conditions including obstacle clearance and minimum ground roll.',
    'pre-solo',
    '["Short-field takeoff technique — maximum performance", "Soft-field takeoff technique — keeping weight off nosewheel", "Obstacle clearance and Vx climb", "Short-field approach and landing — aiming point, firm touchdown", "Soft-field landing — minimum nose-wheel loading"]',
    '["Short-field takeoff with obstacle clearance", "Short-field approach and landing (within 200 ft)", "Soft-field takeoff", "Soft-field approach and landing"]',
    'Student performs short-field landings within 200 ft beyond a designated point, demonstrates obstacle clearance technique on takeoff, and demonstrates soft-field technique with proper pitch control throughout.',
    9, v_instructor_id
  ),

  (
    v_course_id, 10,
    'Radio Communications and ATC',
    'Comprehensive training on radio phraseology, transponder operations, and operating at controlled (Class D) airports.',
    'pre-solo',
    '["Radio phraseology and standard ATC communications", "Transponder codes (1200, 7500, 7600, 7700)", "Flight following request procedures", "Class D airspace requirements and entry", "ATIS, ground control, and tower frequencies"]',
    '["Radio communication practice — taxi, takeoff, pattern", "Class D airport operations", "Obtaining and reading back clearances", "Transitioning between frequencies"]',
    'Student communicates with ATC using proper phraseology, reads back clearances accurately, and demonstrates confidence navigating Class D airspace procedures with minimal instructor prompting.',
    10, v_instructor_id
  ),

  (
    v_course_id, 11,
    'Solo Prep Review',
    'Comprehensive review of all basic maneuvers and traffic pattern operations in preparation for solo flight endorsement.',
    'pre-solo',
    '["Solo endorsement requirements (14 CFR §61.87)", "Student pilot solo limitations", "Emergency review — engine failure in the pattern", "Personal weather minimums for solo", "Instructor expectations for solo readiness"]',
    '["Traffic pattern proficiency (3+ landings)", "Normal and crosswind landings", "Go-arounds", "Slow flight and stalls review", "Emergency procedures review"]',
    'Student demonstrates consistent, safe traffic pattern operations with minimal instructor input. All landings are within centerline and touchdown zone. Go-arounds are initiated without hesitation when needed.',
    11, v_instructor_id
  ),

  (
    v_course_id, 12,
    'Pre-Solo Knowledge Test',
    'Ground lesson to complete the pre-solo written exam covering FARs, airspace, weather minimums, and aircraft systems.',
    'pre-solo',
    '["14 CFR Part 61 — student pilot privileges and limitations", "14 CFR Part 91 — general operating rules", "Airspace classifications (A, B, C, D, E, G)", "VFR weather minimums by airspace", "Aircraft systems and limitations", "Airport operations and right-of-way rules"]',
    '[]',
    'Student completes the pre-solo written knowledge test with a passing score (≥70%) and reviews all missed questions with the instructor until full understanding is achieved.',
    12, v_instructor_id
  ),

  (
    v_course_id, 13,
    'First Solo Flight',
    'Milestone flight — the student performs three full-stop landings in the traffic pattern as pilot in command with instructor observation from the ground.',
    'pre-solo',
    '["Solo procedures review", "Weather check and go/no-go decision", "NOTAM review for local area", "Emergency contingency plan", "Instructor ground observation procedures"]',
    '["Solo traffic pattern — minimum 3 full-stop landings", "Normal takeoffs and landings", "Radio communications (solo)"]',
    'Student safely completes three full-stop landings solo, maintaining centerline control, proper pattern altitude, appropriate approach speed, and effective radio communications.',
    13, v_instructor_id
  ),

  (
    v_course_id, 14,
    'Solo Practice 1',
    'First solo practice session building confidence and proficiency in the traffic pattern with normal and crosswind operations.',
    'pre-solo',
    '["Self-evaluation and self-critique", "Weather briefing — independent assessment", "Personal minimums reinforcement"]',
    '["Solo traffic pattern (5+ landings)", "Normal landings", "Crosswind landing practice", "Departure and arrival procedures"]',
    'Student performs 5+ landings with consistent approach speed (±5 kts), touchdown within the first third of the runway, and proper radio calls. Self-debriefs landing quality.',
    14, v_instructor_id
  ),

  (
    v_course_id, 15,
    'Solo Practice 2',
    'Continued solo pattern work focusing on short-field, soft-field, and crosswind proficiency building.',
    'pre-solo',
    '["Performance improvement strategies", "Personal minimums review", "Energy management in the pattern", "Decision-making for landing options"]',
    '["Solo traffic pattern", "Short-field landing practice", "Soft-field landing practice", "Crosswind techniques", "Go-around practice"]',
    'Student demonstrates proficiency in short-field landings (within 200 ft of point), soft-field technique, and makes independent go-around decisions when approaches are unstabilized.',
    15, v_instructor_id
  ),

  -- =====================================================
  -- CROSS-COUNTRY STAGE (Lessons 16–25)
  -- =====================================================

  (
    v_course_id, 16,
    'Basic Instrument Flying',
    'Introduction to attitude instrument flying for VFR pilots including partial panel operations and unusual attitude recovery.',
    'cross-country',
    '["Attitude instrument flying — pitch, bank, power", "Primary and supporting instruments", "Partial panel procedures (vacuum failure)", "Unusual attitude recognition and recovery", "Spatial disorientation awareness"]',
    '["Straight-and-level by reference to instruments", "Standard-rate turns (3°/sec)", "Constant-rate climbs and descents by instruments", "Unusual attitude recovery", "Partial panel flying (simulated vacuum failure)"]',
    'Student maintains altitude ±200 ft, heading ±20°, and airspeed ±10 kts during basic instrument maneuvers. Recovers from unusual attitudes with correct sequence (level wings, adjust pitch, adjust power).',
    16, v_instructor_id
  ),

  (
    v_course_id, 17,
    'VOR Navigation',
    'Learn VOR radio navigation including station identification, radial tracking, and course intercepts for cross-country use.',
    'cross-country',
    '["VOR system operation and limitations", "Radials, bearings, CDI interpretation", "TO/FROM indicator usage", "Tracking and intercepting radials", "VOR cross-check and triangulation", "GPS as a supplemental navigation tool"]',
    '["VOR station identification", "Tracking TO and FROM a VOR", "Intercepting a specified radial", "VOR triangulation for position fix", "Transition between VOR frequencies"]',
    'Student tracks a VOR radial within ±5° CDI deflection, intercepts assigned radials within a reasonable timeframe, and correctly identifies station Morse code before using a VOR for navigation.',
    17, v_instructor_id
  ),

  (
    v_course_id, 18,
    'Cross-Country Planning',
    'Ground lesson covering comprehensive flight planning for cross-country flights including weather, weight and balance, and performance calculations.',
    'cross-country',
    '["Sectional chart interpretation — symbols, airspace, terrain", "Flight planning form completion", "Weight and balance calculations", "Performance calculations — takeoff/landing distance, cruise", "NOTAM review and interpretation", "Weather products — METARs, TAFs, prog charts, AIRMETs/SIGMETs", "Fuel planning and reserves"]',
    '[]',
    'Student independently completes a cross-country flight plan with accurate calculations for fuel, time, distance, weight and balance, and takeoff/landing performance. Correctly interprets all relevant weather products.',
    18, v_instructor_id
  ),

  (
    v_course_id, 19,
    'Dual Cross-Country 1',
    'First dual cross-country flight covering pilotage, dead reckoning, checkpoint identification, and diversion planning over a >50 nm route.',
    'cross-country',
    '["Pilotage — visual navigation using sectional chart", "Dead reckoning — heading, groundspeed, ETA calculation", "Fuel management and monitoring", "Checkpoint identification and timing", "Diversion planning and execution"]',
    '["Cross-country flight >50 nm", "Pilotage and dead reckoning navigation", "Checkpoint identification and ETA updates", "VOR cross-reference during flight", "Diversion to alternate airport"]',
    'Student navigates a cross-country route using pilotage and dead reckoning, identifies checkpoints within ±2 minutes of planned ETA, and successfully diverts to an alternate airport when directed.',
    19, v_instructor_id
  ),

  (
    v_course_id, 20,
    'Dual Cross-Country 2',
    'Second dual cross-country to a different airport incorporating flight following, VOR navigation, and real-world ATC interaction.',
    'cross-country',
    '["Weather product updates (GOES-R imagery, PIREPs)", "TFR awareness and checking procedures", "VFR flight plan filing and activation", "Flight following procedures", "Fuel stop planning"]',
    '["Cross-country to unfamiliar airport", "VOR navigation as primary method", "Request and use flight following", "Unfamiliar airport arrival procedures", "Flight plan opening and closing"]',
    'Student navigates using VOR as primary method, communicates with ATC for flight following without prompting, and successfully arrives at an unfamiliar airport within ±5 minutes of planned ETA.',
    20, v_instructor_id
  ),

  (
    v_course_id, 21,
    'Night Flying',
    'Night flying operations including night vision adaptation, lighting systems, illusions, and night cross-country navigation.',
    'cross-country',
    '["Night vision physiology and adaptation (30 min dark adaptation)", "Aircraft and airport lighting systems", "Night illusions — black hole approach, false horizons, autokinesis", "Night emergency procedures", "Night VFR weather requirements", "Equipment requirements for night flight (14 CFR §91.205)"]',
    '["Night preflight inspection", "Night takeoffs and landings (10+ required for certificate)", "Night traffic pattern operations", "Night cross-country navigation (ground reference and VOR)", "Night emergency procedures"]',
    'Student completes the required night takeoffs and landings (10+ full-stop), navigates a night cross-country segment using ground lights and VOR, and demonstrates awareness of night-specific illusions and hazards.',
    21, v_instructor_id
  ),

  (
    v_course_id, 22,
    'Solo Cross-Country 1',
    'First solo cross-country flight covering >50 nm with full-stop landings at 2 or more airports, demonstrating independent flight planning and decision-making.',
    'cross-country',
    '["Independent flight planning and go/no-go decision", "Solo cross-country endorsement requirements", "Weather self-briefing", "Fuel planning for solo operations", "Lost procedures and diversion planning"]',
    '["Solo cross-country >50 nm", "Full-stop landings at 2+ airports", "Pilotage and dead reckoning", "Radio communications at unfamiliar airports"]',
    'Student independently plans and executes a solo cross-country flight >50 nm, makes full-stop landings at a minimum of 2 airports, and arrives within ±10 minutes of planned ETA at each stop.',
    22, v_instructor_id
  ),

  (
    v_course_id, 23,
    'Solo Cross-Country 2 (Long)',
    'Solo long cross-country satisfying the 14 CFR §61.109 requirement: >150 nm total distance, 3 points of landing, with at least one segment >50 nm.',
    'cross-country',
    '["Long cross-country planning and fuel management", "Solo long cross-country requirements (14 CFR §61.109)", "Multi-leg flight planning", "Go/no-go decision-making for extended flights"]',
    '["Solo cross-country >150 nm total distance", "Landings at 3+ airports", "At least one leg >50 nm straight-line distance", "Full-stop landings at each point"]',
    'Student successfully completes the required long solo cross-country (>150 nm, 3+ landing points, 1 segment >50 nm) with proper fuel management, accurate navigation, and safe operations at all airports.',
    23, v_instructor_id
  ),

  (
    v_course_id, 24,
    'Solo Cross-Country 3',
    'Additional solo cross-country for proficiency building, incorporating diversions and real-world decision-making scenarios.',
    'cross-country',
    '["Flight planning proficiency", "Weather-based diversion decision-making", "Real-time flight plan adjustments", "Self-assessment and risk management"]',
    '["Solo cross-country with planned diversion", "Navigation using multiple methods", "Unfamiliar airport operations", "Independent fuel management"]',
    'Student demonstrates proficient solo cross-country operations including an in-flight diversion decision based on simulated or actual weather, correct alternate airport selection, and safe arrival.',
    24, v_instructor_id
  ),

  (
    v_course_id, 25,
    'Towered Airport Operations',
    'Gain experience operating at towered airports in Class C or D airspace with full ATC communication including ATIS, ground, tower, and approach.',
    'cross-country',
    '["Class C and D airspace requirements", "ATIS — obtaining and reading information", "Ground control, tower, and approach frequencies", "Clearance delivery and read-back procedures", "Progressive taxi instructions"]',
    '["Fly to a Class C or D towered airport", "ATIS copy and read-back", "Full ATC communications — ground, tower, approach", "Pattern operations at a towered field", "Progressive taxi (if available)"]',
    'Student demonstrates confidence and proficiency communicating with tower, ground, and approach controllers. Correctly copies ATIS, reads back all clearances, and navigates the airport surface without hesitation.',
    25, v_instructor_id
  ),

  -- =====================================================
  -- CHECKRIDE PREP STAGE (Lessons 26–32)
  -- =====================================================

  (
    v_course_id, 26,
    'Maneuver Review 1 — Airwork',
    'Review of steep turns, slow flight, stalls, and ground reference maneuvers to ACS (Airman Certification Standards) proficiency.',
    'checkride-prep',
    '["ACS standards review — tolerances for each maneuver", "Personal minimums vs ACS minimums", "Common errors and self-correction strategies", "Risk management during airwork"]',
    '["Steep turns (45° bank, ±100 ft, ±10 kts, ±5°)", "Slow flight to ACS standards", "Power-on stalls to ACS standards", "Power-off stalls to ACS standards", "Ground reference maneuvers to ACS standards"]',
    'Student performs all airwork maneuvers within ACS tolerances: steep turns ±100 ft, ±10 kts; slow flight maintaining altitude ±100 ft; stall recovery with minimal altitude loss; ground reference maneuvers at constant altitude ±100 ft.',
    26, v_instructor_id
  ),

  (
    v_course_id, 27,
    'Maneuver Review 2 — Approaches and Emergencies',
    'Review of emergency procedures, short/soft field operations, and basic instrument flying to ACS standards.',
    'checkride-prep',
    '["Common checkride failure areas", "Examiner expectations and evaluation criteria", "Emergency procedure sequencing", "Stabilized approach criteria"]',
    '["Simulated engine failure and emergency approach", "Short-field takeoff and landing to ACS standards", "Soft-field takeoff and landing to ACS standards", "Basic instrument maneuvers under the hood", "Forward slip to landing"]',
    'Student performs short-field landings within 200 ft of point, soft-field operations with proper technique, emergency approach to a suitable field, and basic instrument maneuvers within ACS tolerances — all without instructor intervention.',
    27, v_instructor_id
  ),

  (
    v_course_id, 28,
    'Mock Oral Exam',
    'Full-length simulated oral exam covering all ACS areas of operation to identify knowledge gaps before the checkride.',
    'checkride-prep',
    '["Pilot qualifications and currency requirements", "Airworthiness — required documents, inspections, AD compliance", "Weather theory and products interpretation", "Cross-country flight planning and navigation", "Aircraft systems and performance", "Aeromedical factors — hypoxia, hyperventilation, spatial disorientation", "14 CFR Parts 61 and 91 regulatory knowledge", "National Airspace System and chart interpretation"]',
    '[]',
    'Student answers oral exam questions accurately and confidently across all ACS areas of operation. Any weak areas are identified and a remediation plan is created for follow-up study.',
    28, v_instructor_id
  ),

  (
    v_course_id, 29,
    'Mock Checkride Flight',
    'Full simulated practical test covering the complete checkride profile with all maneuvers evaluated to ACS standards.',
    'checkride-prep',
    '["Checkride procedures — opening, sequencing, closing", "Practical test standards and ACS criteria", "Examiner communication and CRM", "Discontinuance vs disapproval implications"]',
    '["Complete checkride profile flight", "Normal and crosswind takeoffs/landings", "Short-field and soft-field operations", "Steep turns, slow flight, stalls", "Ground reference maneuvers", "Emergency procedures", "Basic instrument maneuvers", "Navigation and diversion", "Go-around"]',
    'Student completes a full mock checkride to ACS standards without any unsatisfactory (U) grades. Demonstrates safe, competent pilot-in-command decision-making throughout the flight.',
    29, v_instructor_id
  ),

  (
    v_course_id, 30,
    'Weak Area Remediation',
    'Targeted practice session focusing on any maneuvers or knowledge areas that did not meet ACS standards during the mock checkride.',
    'checkride-prep',
    '["Review of mock checkride debrief notes", "Targeted study of weak knowledge areas", "Technique corrections for deficient maneuvers", "Confidence-building strategies"]',
    '["Targeted practice of weak maneuvers (varies per student)", "Repeated maneuver practice to build consistency", "Scenario-based training for weak decision-making areas"]',
    'Student demonstrates improvement in all previously weak areas to ACS standards. Consecutive attempts of each deficient maneuver are within tolerances.',
    30, v_instructor_id
  ),

  (
    v_course_id, 31,
    'Final Stage Check',
    'Comprehensive stage check administered by a senior instructor or check instructor simulating the full checkride experience.',
    'checkride-prep',
    '["Stage check procedures and expectations", "Comprehensive knowledge review", "Self-assessment of readiness", "Stress management and checkride mindset"]',
    '["Complete stage check flight — full checkride profile", "All maneuvers evaluated to ACS tolerances", "Oral questioning during flight", "Scenario-based emergency evaluation"]',
    'Student passes the final stage check with all maneuvers meeting ACS standards. Recommending instructor is confident the student will pass the practical test.',
    31, v_instructor_id
  ),

  (
    v_course_id, 32,
    'Checkride Prep and Endorsement',
    'Final preparation — complete all paperwork, IACRA application, logbook endorsements, and a confidence-building flight before the checkride.',
    'checkride-prep',
    '["IACRA application completion and submission", "Logbook endorsement requirements for practical test", "Required documents — ID, medical, logbook, knowledge test results", "DPE scheduling and fees", "Checkride day procedures and what to expect", "Aircraft documents — AROW"]',
    '["Confidence flight — student''s choice of maneuvers", "Traffic pattern work", "Final review of any requested maneuvers"]',
    'Student has all required paperwork completed (IACRA, endorsements, documents). Demonstrates calm, confident flying during the confidence flight. Instructor provides the final practical test endorsement.',
    32, v_instructor_id
  );

END $$;
