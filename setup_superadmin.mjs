import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error("Error listing users:", listError);
    return;
  }
  
  const user = usersData.users.find(u => u.email === 'rafael.gaviorno@gmail.com');
  
  if (!user) {
    console.error("User not found!");
    return;
  }
  
  const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, is_superadmin: true, nome: 'Rafael Gaviorno' },
    password: '@Bia051098'
  });

  if (error) {
    console.error("Error updating superadmin:", error);
  } else {
    console.log("Superadmin updated successfully!", data.user.id);
  }
}

run();
