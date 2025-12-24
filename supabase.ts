
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jvsdzypqjkfzuhlpdpxm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_4hbUbigjoM7Ag_DDU_qOKw_AdTpXFO6';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Persists the core application state (VFS, PilotConfig) to the cloud.
 */
export const persistAppState = async (vfs: any, pilotConfig: any) => {
  try {
    const { error } = await supabase
      .from('app_storage')
      .upsert({ 
        id: 'default_session', 
        vfs_json: vfs, 
        pilot_config: pilotConfig,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase: Table "app_storage" may not exist yet. Please run the SQL setup script.');
      console.error('Cloud Sync Error (State):', error.message);
    }
  } catch (err: any) {
    console.error('Network Error (State):', err.message);
  }
};

/**
 * Appends a log entry to the remote database.
 */
export const persistLog = async (log: any) => {
  try {
    const { error } = await supabase
      .from('logs')
      .insert([{
        id: log.id,
        timestamp: log.timestamp,
        level: log.level,
        message: log.message,
        details: log.details || null,
        file: log.file || null,
        code_snippet: log.codeSnippet || null
      }]);
    if (error) {
      console.error('Cloud Sync Error (Log):', error.message);
    }
  } catch (err: any) {
    // Silent catch for logs to prevent console spam if database isn't ready
  }
};

/**
 * Persists chat history to the remote database.
 */
export const persistChat = async (message: any) => {
  try {
    const { error } = await supabase
      .from('chat_history')
      .insert([{
        id: message.id,
        role: message.role,
        content: message.content
      }]);
    if (error) {
      console.error('Cloud Sync Error (Chat):', error.message);
    }
  } catch (err: any) {
    console.error('Network Error (Chat):', err.message);
  }
};

/**
 * Fetches the latest session data from Supabase.
 */
export const fetchLatestSession = async () => {
  try {
    const { data, error } = await supabase
      .from('app_storage')
      .select('*')
      .eq('id', 'default_session')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No session found, normal for first run
        return null;
      }
      if (error.message.includes('not found')) {
        console.warn('DATABASE INITIALIZATION REQUIRED: Please run the provided SQL script in your Supabase SQL Editor.');
      }
      console.error('Cloud Fetch Error:', error.message);
      return null;
    }
    return data;
  } catch (err: any) {
    console.error('Network Error (Fetch):', err.message);
    return null;
  }
};
