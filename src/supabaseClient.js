
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://asoxjydouuuqnktauvha.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzb3hqeWRvdXV1cW5rdGF1dmhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NTM1MTQsImV4cCI6MjA4MzUyOTUxNH0.rI1BxT7Uquh5yCukYUipI4RNwQAsXs0d5KlcODNoUjE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
