import { Github, Heart } from 'lucide-react';
import { motion } from 'motion/react';

interface FooterProps {
  isDark: boolean;
}

export function Footer({ isDark }: FooterProps) {
  return (
    <footer className={`border-t ${isDark ? 'border-[#2a2a2a]' : 'border-[#e0e0e0]'} py-8`}>
      <div className="max-w-3xl mx-auto px-4">
        <motion.div 
          className={`text-center text-xs ${isDark ? 'text-[#6a6a6a]' : 'text-[#999999]'}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <p>Baixe e transcreva conteúdo das redes sociais</p>
          <p className="mt-1">Suporta Instagram, YouTube, TikTok e X (Twitter)</p>
        </motion.div>
      </div>
    </footer>
  );
}