import { X } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, useEffect } from 'react';

export interface AppSettings {
  videoQuality: string;
  audioFormat: string;
  transcriptionLanguage: string;
}

interface SettingsPanelProps {
  isDark: boolean;
  onClose: () => void;
  onSettingsChange?: (settings: AppSettings) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  videoQuality: 'max',
  audioFormat: 'mp3',
  transcriptionLanguage: 'auto',
};

export function SettingsPanel({ isDark, onClose, onSettingsChange }: SettingsPanelProps) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('app_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (err) {
        console.error('Failed to parse saved settings:', err);
      }
    }
  }, []);

  // Save settings to localStorage and notify parent when they change
  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('app_settings', JSON.stringify(newSettings));
    onSettingsChange?.(newSettings);
  };
  return (
    <motion.div 
      className={`${isDark ? 'bg-[#1a1a1a] border-[#2a2a2a]' : 'bg-white border-[#e0e0e0]'} border rounded-xl p-6 space-y-6`}
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Configurações</h3>
        <motion.button
          onClick={onClose}
          className={`p-1 ${isDark ? 'hover:bg-[#252525]' : 'hover:bg-[#f0f0f0]'} rounded transition-colors`}
          aria-label="Fechar configurações"
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
        >
          <X className="w-5 h-5" />
        </motion.button>
      </div>

      <div className="space-y-4">
        {/* Video Quality */}
        <motion.div 
          className="space-y-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <label className={`text-sm ${isDark ? 'text-[#a0a0a0]' : 'text-[#666666]'}`}>Qualidade do Vídeo</label>
          <select 
            value={settings.videoQuality}
            onChange={(e) => updateSetting('videoQuality', e.target.value)}
            className={`w-full px-4 py-2 ${isDark ? 'bg-[#0f0f0f] border-[#2a2a2a] text-white' : 'bg-[#f5f5f5] border-[#d0d0d0] text-[#1a1a1a]'} border rounded-lg focus:outline-none ${isDark ? 'focus:border-[#4a4a4a]' : 'focus:border-[#999999]'}`}
          >
            <option value="max">Máxima (padrão)</option>
            <option value="1080">1080p</option>
            <option value="720">720p</option>
            <option value="480">480p</option>
          </select>
        </motion.div>

        {/* Audio Format */}
        <motion.div 
          className="space-y-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
        >
          <label className={`text-sm ${isDark ? 'text-[#a0a0a0]' : 'text-[#666666]'}`}>Formato de Áudio</label>
          <select 
            value={settings.audioFormat}
            onChange={(e) => updateSetting('audioFormat', e.target.value)}
            className={`w-full px-4 py-2 ${isDark ? 'bg-[#0f0f0f] border-[#2a2a2a] text-white' : 'bg-[#f5f5f5] border-[#d0d0d0] text-[#1a1a1a]'} border rounded-lg focus:outline-none ${isDark ? 'focus:border-[#4a4a4a]' : 'focus:border-[#999999]'}`}
          >
            <option value="mp3">MP3</option>
            <option value="wav">WAV</option>
            <option value="m4a">M4A</option>
          </select>
        </motion.div>

        {/* Transcription Language */}
        <motion.div 
          className="space-y-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <label className={`text-sm ${isDark ? 'text-[#a0a0a0]' : 'text-[#666666]'}`}>Idioma da Transcrição</label>
          <select 
            value={settings.transcriptionLanguage}
            onChange={(e) => updateSetting('transcriptionLanguage', e.target.value)}
            className={`w-full px-4 py-2 ${isDark ? 'bg-[#0f0f0f] border-[#2a2a2a] text-white' : 'bg-[#f5f5f5] border-[#d0d0d0] text-[#1a1a1a]'} border rounded-lg focus:outline-none ${isDark ? 'focus:border-[#4a4a4a]' : 'focus:border-[#999999]'}`}
          >
            <option value="auto">Detectar automaticamente</option>
            <option value="pt">Português</option>
            <option value="en">Inglês</option>
            <option value="es">Espanhol</option>
            <option value="fr">Francês</option>
            <option value="de">Alemão</option>
            <option value="it">Italiano</option>
            <option value="ja">Japonês</option>
            <option value="ko">Coreano</option>
            <option value="zh">Chinês</option>
          </select>
        </motion.div>

        {/* Toggle Options */}
        <motion.div 
          className="space-y-3 pt-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
        >
          <label className="flex items-center justify-between cursor-pointer">
            <span className={`text-sm ${isDark ? 'text-[#a0a0a0]' : 'text-[#666666]'}`}>Incluir áudio nos downloads de vídeo</span>
            <input type="checkbox" defaultChecked className="w-4 h-4" />
          </label>
          
          <label className="flex items-center justify-between cursor-pointer">
            <span className={`text-sm ${isDark ? 'text-[#a0a0a0]' : 'text-[#666666]'}`}>Transcrever áudio automaticamente</span>
            <input type="checkbox" className="w-4 h-4" />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className={`text-sm ${isDark ? 'text-[#a0a0a0]' : 'text-[#666666]'}`}>Baixar todas as imagens do carrossel</span>
            <input type="checkbox" defaultChecked className="w-4 h-4" />
          </label>
        </motion.div>
      </div>

      <div className={`pt-4 border-t ${isDark ? 'border-[#2a2a2a]' : 'border-[#e0e0e0]'}`}>
        <p className={`text-xs ${isDark ? 'text-[#6a6a6a]' : 'text-[#999999]'}`}>
          As configurações são salvas localmente no seu navegador
        </p>
      </div>
    </motion.div>
  );
}