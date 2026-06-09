"use client";

import { useState, useEffect } from "react";
import { Sparkles, Music, Play, Square, ListMusic, Disc, Loader2, ArrowRight } from "lucide-react";

type TaskStatus = "idle" | "pending" | "processing" | "success" | "failed";

interface MusicTask {
  id: string;
  genres: string;
  lyrics: string;
  status: TaskStatus;
  progress: number;
  audioUrl?: string;       // 完整混音轨
  instrumentalUrl?: string; // 伴奏分轨
  vocalUrl?: string;        // 人声分轨
}

export default function Home() {
  const [genres, setGenres] = useState("female pop, sad emotional, piano, acoustic guitar, 120bpm");
  const [lyrics, setLyrics] = useState(
    "[verse]\nIn the fading light, the shadows grow so long\nWalking down the street where we used to belong\n\n[chorus]\nDon't turn away, don't leave me in the dark\nEvery memory of us is just a dying spark"
  );

  const [currentTask, setCurrentTask] = useState<MusicTask | null>(null);
  const [history, setHistory] = useState<MusicTask[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // 当前播放的轨道类型 ('full' | 'inst' | 'vocal')
  const [activeTrack, setActiveTrack] = useState<'full' | 'inst' | 'vocal'>('full');

  // 【全自动高频网关轮询逻辑】
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (currentTask && (currentTask.status === "pending" || currentTask.status === "processing")) {
      timer = setInterval(async () => {
        try {
          // 精准向本地绑定的 FastAPI 127.0.0.1 端口发起查询
          const res = await fetch(`http://127.0.0.1:8000/api/tasks/${currentTask.id}`);
          if (!res.ok) throw new Error("云端网关拒绝通信");
          
          const data = await res.json();
          
          setCurrentTask({
            id: data.id,
            genres: data.genres,
            lyrics: data.lyrics,
            status: data.status as TaskStatus,
            progress: data.progress ?? 0,
            audioUrl: data.audioUrl,
            instrumentalUrl: data.instrumentalUrl,
            vocalUrl: data.vocalUrl,
          });

          // 推理成功，终止轮询并压入历史流
          if (data.status === "success") {
            clearInterval(timer);
            setHistory((h) => {
              if (h.some((item) => item.id === data.id)) return h;
              return [
                {
                  id: data.id,
                  genres: data.genres,
                  lyrics: data.lyrics,
                  status: "success",
                  progress: 100,
                  audioUrl: data.audioUrl,
                  instrumentalUrl: data.instrumentalUrl,
                  vocalUrl: data.vocalUrl,
                },
                ...h,
              ];
            });
          } else if (data.status === "failed") {
            clearInterval(timer);
            alert("云端大模型算力推理遇到阻碍，请检查后台显存。");
          }
        } catch (e) {
          console.error("[联调警报] 无法成功连接到 FastAPI 算力网关:", e);
        }
      }, 1500); // 1.5秒回传一次真实百分比
    }

    return () => clearInterval(timer);
  }, [currentTask?.id, currentTask?.status]);

  // 【触发真实大模型云端生成请求】
  const handleGenerate = async () => {
    if (!genres.trim() || !lyrics.trim()) return;

    setIsPlaying(false);
    setActiveTrack('full');

    try {
      const res = await fetch('http://127.0.0.1:8000/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genres, lyrics })
      });
      
      if (!res.ok) throw new Error("网关拒绝接收写歌请求");
      
      const data = await res.json(); 

      setCurrentTask({
        id: data.taskId,
        genres,
        lyrics,
        status: "pending",
        progress: 0,
      });
    } catch (e) {
      console.error("生成音乐连线异常:", e);
      alert("连线大模型失败！请确保你在终端运行了: uvicorn main:app --host 127.0.0.1 --port 8000");
    }
  };

  // 动态获取当前需要播放的音频流链接
  const getCurrentAudioSrc = () => {
    if (!currentTask) return "";
    if (activeTrack === 'inst') return currentTask.instrumentalUrl || "";
    if (activeTrack === 'vocal') return currentTask.vocalUrl || "";
    return currentTask.audioUrl || "";
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col">
      {/* 顶部导航 */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-lime-400 p-2 rounded-xl text-black">
            <Music className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">YuE Studio</h1>
            <p className="text-xs text-zinc-400">ByteDance YuE Engine Cloud v1.0</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Cloud AI GPU Cluster Online
          </span>
        </div>
      </header>

      {/* 主工作区 */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-hidden">
        
        {/* 左侧：输入面板 */}
        <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800/80 rounded-2xl p-5 flex flex-col gap-5 shadow-xl">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
            <Sparkles className="w-5 h-5 text-lime-400" />
            <h2 className="font-semibold text-zinc-200">创作参数配置</h2>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">曲风与人声标签 (Genres & Vocal)</label>
            <input
              type="text"
              value={genres}
              onChange={(e) => setGenres(e.target.value)}
              placeholder="例如: male rock, energetic, heavy drums..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-lime-400 transition"
            />
          </div>

          <div className="flex-1 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">结构化歌词 (Structured Lyrics)</label>
              <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">支持 [verse] / [chorus]</span>
            </div>
            <textarea
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              className="w-full flex-1 min-h-[250px] bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm font-mono text-zinc-200 focus:outline-none focus:border-lime-400 transition resize-none leading-relaxed"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={currentTask?.status === "pending" || currentTask?.status === "processing"}
            className="w-full bg-lime-400 hover:bg-lime-300 disabled:bg-zinc-800 text-black disabled:text-zinc-500 font-semibold py-4 px-6 rounded-xl transition flex items-center justify-center gap-2 shadow-lg"
          >
            {currentTask?.status === "pending" || currentTask?.status === "processing" ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                AI 云端算力深度推理中 ({currentTask.progress}%)
              </>
            ) : (
              <>
                释放灵感 · 生成音乐
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* 右侧：播放与多轨控制面板 */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-6 flex flex-col justify-center min-h-[200px] shadow-xl relative overflow-hidden">
            {!currentTask ? (
              <div className="text-center text-zinc-500 flex flex-col items-center gap-3 py-4">
                <Disc className="w-12 h-12 stroke-[1.2] text-zinc-700 animate-[spin_8s_linear_infinite]" />
                <p className="text-sm">在左侧填入灵感，点击按钮让 AI 释放音符</p>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-xs font-mono px-2 py-1 bg-zinc-800 rounded text-zinc-400">Task ID: {currentTask.id}</span>
                    <p className="text-sm text-zinc-400 mt-2 line-clamp-1"><strong className="text-zinc-200">曲风:</strong> {currentTask.genres}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    currentTask.status === "success" ? "bg-emerald-500/10 text-emerald-400" :
                    currentTask.status === "failed" ? "bg-rose-500/10 text-rose-400" : "bg-amber-500/10 text-amber-400"
                  }`}>
                    {currentTask.status.toUpperCase()}
                  </span>
                </div>

                {currentTask.status !== "success" ? (
                  <div className="space-y-2 mt-4">
                    <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800">
                      <div 
                        className="bg-lime-400 h-full transition-all duration-500 ease-out"
                        style={{ width: `${currentTask.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-right text-zinc-500 font-mono">云端多轨声弦渲染中... {currentTask.progress}%</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* YuE 特色功能：多轨伴奏/人声切轨器 */}
                    <div className="flex gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800 w-fit text-xs">
                      <button 
                        onClick={() => setActiveTrack('full')}
                        className={`px-3 py-1.5 rounded-lg font-medium transition ${activeTrack === 'full' ? 'bg-lime-400 text-black' : 'text-zinc-400 hover:text-zinc-200'}`}
                      >
                        完整混音轨 (Full Mix)
                      </button>
                      <button 
                        onClick={() => setActiveTrack('inst')}
                        className={`px-3 py-1.5 rounded-lg font-medium transition ${activeTrack === 'inst' ? 'bg-lime-400 text-black' : 'text-zinc-400 hover:text-zinc-200'}`}
                      >
                        纯伴奏 (Instrumental)
                      </button>
                      <button 
                        onClick={() => setActiveTrack('vocal')}
                        className={`px-3 py-1.5 rounded-lg font-medium transition ${activeTrack === 'vocal' ? 'bg-lime-400 text-black' : 'text-zinc-400 hover:text-zinc-200'}`}
                      >
                        纯人声 (Acapella)
                      </button>
                    </div>

                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
                      <button 
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="bg-lime-400 hover:bg-lime-300 text-black p-3 rounded-full transition shadow-md"
                      >
                        {isPlaying ? <Square className="w-5 h-5 fill-black" strokeWidth={0} /> : <Play className="w-5 h-5 fill-black" strokeWidth={0} />}
                      </button>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-zinc-200 flex items-center gap-1.5">
                          YuE_Track_{currentTask.id}_{activeTrack}.mp3
                        </p>
                        
                        <div className="flex items-center gap-[3px] h-6 mt-1.5">
                          {Array.from({ length: 54 }).map((_, i) => (
                            <div 
                              key={i} 
                              className={`w-[3px] rounded-full transition-all duration-300 ${isPlaying ? 'bg-lime-400' : 'bg-zinc-700'}`}
                              style={{ 
                                height: isPlaying ? `${Math.floor(Math.random() * 85) + 15}%` : '25%',
                                opacity: isPlaying ? 0.3 + (i % 4) * 0.18 : 0.5 
                              }}
                            />
                          ))}
                        </div>
                        {/* 硬件级修复：复合 Key 彻底击碎跨轨道重用缓存，切轨音色立变 */}
                        {isPlaying && (
                          <audio 
                            autoPlay 
                            key={`${currentTask.id}-${activeTrack}`} 
                            src={getCurrentAudioSrc()} 
                            className="hidden" 
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 历史作品流 */}
          <div className="flex-1 bg-zinc-900 border border-zinc-800/80 rounded-2xl p-5 flex flex-col gap-4 shadow-xl overflow-hidden">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
              <ListMusic className="w-5 h-5 text-zinc-400" />
              <h2 className="font-semibold text-zinc-200">历史音乐流 (Fediverse Ready)</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {history.length === 0 ? (
                <p className="text-sm text-zinc-600 text-center py-12">暂无历史生成的歌曲</p>
              ) : (
                history.map((item, index) => (
                  <div key={`${item.id}-${index}`} className="bg-zinc-950 border border-zinc-800/60 p-3.5 rounded-xl flex items-center justify-between hover:border-zinc-700 transition group">
                    <div className="flex items-center gap-3">
                      <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800">
                        <Disc className="w-5 h-5 text-zinc-400 animate-[spin_12s_linear_infinite]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-300">Track_{item.id}.mp3</p>
                        <p className="text-xs text-zinc-500 line-clamp-1 max-w-[320px]">{item.genres}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setCurrentTask(item);
                          setActiveTrack('full');
                          setIsPlaying(true);
                        }}
                        className="text-xs text-lime-400 bg-lime-400/5 px-2.5 py-1.5 rounded-lg border border-lime-400/10 hover:bg-lime-400/10 transition"
                      >
                        回溯并播放
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}