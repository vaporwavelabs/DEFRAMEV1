
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jvsdzypqjkfzuhlpdpxm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_4hbUbigjoM7Ag_DDU_qOKw_AdTpXFO6';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Performs a lightweight query to check if the Supabase service is reachable and tables are accessible.
 */
export const checkInitialConnection = async () => {
  try {
    const { error } = await supabase
      .from('app_storage')
      .select('id')
      .limit(1);

    // 'PGRST116' means no rows were found, which is a valid state, not an error.
    if (error && error.code !== 'PGRST116') {
      console.error('Cloud Connection Check Error:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('Network Error (Connection Check):', err.message);
    return false;
  }
};


/**
 * Persists the core application state (VFS) to the cloud.
 */
export const persistAppState = async (vfs: any) => {
  try {
    const { error } = await supabase
      .from('app_storage')
      .upsert({ 
        id: 'default_session', 
        vfs_json: vfs,
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
      // This might fail if the table doesn't exist, fail silently.
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

    if (error && error.code !== 'PGRST116') {
      console.error('Cloud Fetch Error (Session):', error.message);
      return null;
    }
    return data;
  } catch (err: any) {
    console.error('Network Error (Fetch Session):', err.message);
    return null;
  }
};

/**
 * Fetches all logs for the current session.
 */
export const fetchAllLogs = async () => {
    try {
        const { data, error } = await supabase
            .from('logs')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(100);
        if (error) {
            console.error('Cloud Fetch Error (Logs):', error.message);
            return [];
        }
        return data;
    } catch (err: any) {
        console.error('Network Error (Fetch Logs):', err.message);
        return [];
    }
};

/**
 * Fetches all chat history for the current session.
 */
export const fetchAllChat = async () => {
    try {
        const { data, error } = await supabase
            .from('chat_history')
            .select('*')
            .order('created_at', { ascending: true });
        if (error) {
            console.error('Cloud Fetch Error (Chat):', error.message);
            return [];
        }
        return data;
    } catch (err: any) {
        console.error('Network Error (Fetch Chat):', err.message);
        return [];
    }
};