--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (415ebe8)
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: content_shares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_shares (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    content_id character varying NOT NULL,
    shared_by character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: h5p_content; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.h5p_content (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    type text NOT NULL,
    data jsonb NOT NULL,
    user_id character varying NOT NULL,
    is_published boolean DEFAULT false NOT NULL,
    tags text[],
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: interaction_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interaction_events (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    content_id character varying NOT NULL,
    event_type text NOT NULL,
    event_data jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: learner_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.learner_progress (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying,
    content_id character varying NOT NULL,
    completion_percentage real DEFAULT 0 NOT NULL,
    completed_at timestamp without time zone,
    last_accessed_at timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    learner_name text,
    session_id character varying
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    full_name text NOT NULL,
    role text DEFAULT 'teacher'::text NOT NULL,
    institution text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: quiz_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_attempts (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    content_id character varying NOT NULL,
    score integer NOT NULL,
    total_questions integer NOT NULL,
    answers jsonb NOT NULL,
    completed_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: content_shares content_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_shares
    ADD CONSTRAINT content_shares_pkey PRIMARY KEY (id);


--
-- Name: h5p_content h5p_content_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.h5p_content
    ADD CONSTRAINT h5p_content_pkey PRIMARY KEY (id);


--
-- Name: interaction_events interaction_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interaction_events
    ADD CONSTRAINT interaction_events_pkey PRIMARY KEY (id);


--
-- Name: learner_progress learner_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learner_progress
    ADD CONSTRAINT learner_progress_pkey PRIMARY KEY (id);


--
-- Name: learner_progress learner_progress_user_id_content_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learner_progress
    ADD CONSTRAINT learner_progress_user_id_content_id_unique UNIQUE (user_id, content_id);


--
-- Name: profiles profiles_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_email_unique UNIQUE (email);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: quiz_attempts quiz_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_pkey PRIMARY KEY (id);


--
-- Name: content_shares content_shares_content_id_h5p_content_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_shares
    ADD CONSTRAINT content_shares_content_id_h5p_content_id_fk FOREIGN KEY (content_id) REFERENCES public.h5p_content(id) ON DELETE CASCADE;


--
-- Name: content_shares content_shares_shared_by_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_shares
    ADD CONSTRAINT content_shares_shared_by_profiles_id_fk FOREIGN KEY (shared_by) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: h5p_content h5p_content_user_id_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.h5p_content
    ADD CONSTRAINT h5p_content_user_id_profiles_id_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: interaction_events interaction_events_content_id_h5p_content_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interaction_events
    ADD CONSTRAINT interaction_events_content_id_h5p_content_id_fk FOREIGN KEY (content_id) REFERENCES public.h5p_content(id) ON DELETE CASCADE;


--
-- Name: interaction_events interaction_events_user_id_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interaction_events
    ADD CONSTRAINT interaction_events_user_id_profiles_id_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: learner_progress learner_progress_content_id_h5p_content_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learner_progress
    ADD CONSTRAINT learner_progress_content_id_h5p_content_id_fk FOREIGN KEY (content_id) REFERENCES public.h5p_content(id) ON DELETE CASCADE;


--
-- Name: learner_progress learner_progress_user_id_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learner_progress
    ADD CONSTRAINT learner_progress_user_id_profiles_id_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: quiz_attempts quiz_attempts_content_id_h5p_content_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_content_id_h5p_content_id_fk FOREIGN KEY (content_id) REFERENCES public.h5p_content(id) ON DELETE CASCADE;


--
-- Name: quiz_attempts quiz_attempts_user_id_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_user_id_profiles_id_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

