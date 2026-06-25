const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create admin client to read site_settings
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const adminClient = createClient(supabaseUrl, serviceKey)

    // Read Cloudinary credentials from site_settings
    const { data: settings } = await adminClient
      .from('site_settings')
      .select('key, value')
      .in('key', ['cloudinary_cloud_name', 'cloudinary_api_key', 'cloudinary_api_secret'])

    const settingsMap: Record<string, string> = {}
    settings?.forEach((s: any) => { if (s.value) settingsMap[s.key] = s.value })

    const cloudName = settingsMap['cloudinary_cloud_name'] || Deno.env.get('CLOUDINARY_CLOUD_NAME')
    const apiKey = settingsMap['cloudinary_api_key'] || Deno.env.get('CLOUDINARY_API_KEY')
    const apiSecret = settingsMap['cloudinary_api_secret'] || Deno.env.get('CLOUDINARY_API_SECRET')

    if (!cloudName || !apiKey || !apiSecret) {
      return new Response(
        JSON.stringify({ error: 'Cloudinary credentials not configured. Go to Admin Settings → Cloudinary to add them.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const folder = formData.get('folder') as string || 'uploads'
    const resourceType = formData.get('resource_type') as string || 'image'

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const timestamp = Math.round(Date.now() / 1000).toString()
    
    // Generate signature
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`
    const encoder = new TextEncoder()
    const data = encoder.encode(paramsToSign)
    const hashBuffer = await crypto.subtle.digest('SHA-1', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Upload to Cloudinary
    const uploadForm = new FormData()
    uploadForm.append('file', file)
    uploadForm.append('api_key', apiKey)
    uploadForm.append('timestamp', timestamp)
    uploadForm.append('signature', signature)
    uploadForm.append('folder', folder)

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`
    const response = await fetch(uploadUrl, { method: 'POST', body: uploadForm })
    const result = await response.json()

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: result.error?.message || 'Upload failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        resource_type: result.resource_type,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
