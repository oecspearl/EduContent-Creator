-- Part 9: curriculum_legacy_strands (6 records)
DELETE FROM curriculum_legacy_strands;
INSERT INTO curriculum_legacy_strands (id, code, name, description, subject, grade_level, sort_order, is_active, created_at, updated_at) VALUES
  ('3969d14e-ddc4-47c6-a8ba-7e90413f1d55', 'NUM', 'Number', 'Understanding of number concepts and operations', 'Mathematics', 'Grade 1', 1, TRUE, '2025-07-21T02:08:57.662073+00:00', '2025-07-21T02:08:57.662073+00:00'),
  ('f0f457bc-bd6b-415b-8e7c-40b49ce8a5bb', 'GEO', 'Geometry', 'Spatial relationships and geometric concepts', 'Mathematics', 'Grade 1', 2, TRUE, '2025-07-21T02:08:57.662073+00:00', '2025-07-21T02:08:57.662073+00:00'),
  ('bf870537-7977-4658-902b-83bd01ab3e36', 'MEAS', 'Measurement', 'Understanding measurement concepts and units', 'Mathematics', 'Grade 1', 3, TRUE, '2025-07-21T02:08:57.662073+00:00', '2025-07-21T02:08:57.662073+00:00'),
  ('958e1ee1-9e38-445f-9360-a2c27e7df97c', 'READ', 'Reading', 'Reading comprehension and fluency', 'English Language Arts', 'Grade 1', 1, TRUE, '2025-07-21T02:08:57.662073+00:00', '2025-07-21T02:08:57.662073+00:00'),
  ('7019a92f-cb84-477d-bd4a-11993ac18030', 'WRITE', 'Writing', 'Written communication and composition', 'English Language Arts', 'Grade 1', 2, TRUE, '2025-07-21T02:08:57.662073+00:00', '2025-07-21T02:08:57.662073+00:00'),
  ('fafddfad-3a84-4675-9719-3b298f31f132', 'SPEAK', 'Speaking & Listening', 'Oral communication skills', 'English Language Arts', 'Grade 1', 3, TRUE, '2025-07-21T02:08:57.662073+00:00', '2025-07-21T02:08:57.662073+00:00');

