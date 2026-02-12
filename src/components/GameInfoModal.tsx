import React, { useState } from 'react';
import { useTranslation } from '../i18n';

interface GameInfoData {
    blackName: string;
    blackRank: string;
    blackTeam: string;
    whiteName: string;
    whiteRank: string;
    whiteTeam: string;
    komi: string;
    handicap: string;
    result: string;
    gameName: string;
    event: string;
    date: string;
    place: string;
    round: string;
    time: string;
    user: string;
    source: string;
    gameComment: string;
    copyright: string;
    annotation: string;
}

interface GameInfoModalProps {
    onClose: () => void;
    onSave: (data: GameInfoData) => void;
    initialData: GameInfoData;
}

const GameInfoModal: React.FC<GameInfoModalProps> = (props) => {
    const { t } = useTranslation();

    // Local state for editing (changes only applied on OK)
    const [data, setData] = useState<GameInfoData>({ ...props.initialData });
    const set = (key: keyof GameInfoData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setData(prev => ({ ...prev, [key]: e.target.value }));

    const handleOk = () => {
        props.onSave(data);
        props.onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4 font-sans text-sm" onClick={props.onClose}>
            <div className="bg-gray-100 rounded-lg shadow-xl w-full max-w-lg border border-gray-400" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex justify-between items-center p-2 border-b border-gray-300 bg-gray-200 rounded-t-lg">
                    <span className="font-normal text-gray-800">{t('gameInfo.title')}</span>
                    <button onClick={props.onClose} className="text-gray-600 hover:text-gray-900 text-lg leading-none">
                        ×
                    </button>
                </div>

                <div className="p-4 space-y-4 max-h-[85vh] overflow-y-auto">
                    {/* Common Section */}
                    <div className="border border-gray-300 rounded p-2 bg-gray-50 relative pt-4">
                        <span className="absolute -top-2.5 left-2 bg-gray-50 px-1 text-xs text-black">{t('gameInfo.basicInfo')}</span>
                        <div className="grid grid-cols-[auto_1fr] gap-2 items-center mb-2">
                            <label className="w-24 text-gray-700">{t('gameInfo.gameName')}</label>
                            <input className="border border-gray-400 px-1 py-0.5 w-full bg-white focus:outline-none focus:border-blue-500"
                                value={data.gameName} onChange={set('gameName')} />
                        </div>

                        <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-x-2 gap-y-2 items-center">
                            <label className="w-24 text-gray-700">{t('gameInfo.white')}</label>
                            <input className="border border-gray-400 px-1 py-0.5 w-full bg-white" value={data.whiteName} onChange={set('whiteName')} />
                            <label className="w-24 text-gray-700 pl-2">{t('gameInfo.black')}</label>
                            <input className="border border-gray-400 px-1 py-0.5 w-full bg-white" value={data.blackName} onChange={set('blackName')} />

                            <label className="w-24 text-gray-700">{t('gameInfo.whiteRank')}</label>
                            <input className="border border-gray-400 px-1 py-0.5 w-full bg-white" value={data.whiteRank} onChange={set('whiteRank')} />
                            <label className="w-24 text-gray-700 pl-2">{t('gameInfo.blackRank')}</label>
                            <input className="border border-gray-400 px-1 py-0.5 w-full bg-white" value={data.blackRank} onChange={set('blackRank')} />

                            <label className="w-24 text-gray-700">{t('gameInfo.whiteTeam')}</label>
                            <input className="border border-gray-400 px-1 py-0.5 w-full bg-white" value={data.whiteTeam} onChange={set('whiteTeam')} />
                            <label className="w-24 text-gray-700 pl-2">{t('gameInfo.blackTeam')}</label>
                            <input className="border border-gray-400 px-1 py-0.5 w-full bg-white" value={data.blackTeam} onChange={set('blackTeam')} />

                            <label className="w-24 text-gray-700">{t('gameInfo.komi')}</label>
                            <input className="border border-gray-400 px-1 py-0.5 w-full bg-white" value={data.komi} onChange={set('komi')} />
                            <label className="w-24 text-gray-700 pl-2">{t('gameInfo.handicap')}</label>
                            <input className="border border-gray-400 px-1 py-0.5 w-full bg-white" value={data.handicap} onChange={set('handicap')} />
                        </div>
                        <div className="grid grid-cols-[auto_1fr] gap-2 items-center mt-2">
                            <label className="w-24 text-gray-700">{t('gameInfo.result')}</label>
                            <input className="border border-gray-400 px-1 py-0.5 w-32 bg-white" value={data.result} onChange={set('result')} />
                        </div>
                    </div>

                    {/* When and Where Section */}
                    <div className="border border-gray-300 rounded p-2 bg-gray-50 relative pt-4">
                        <span className="absolute -top-2.5 left-2 bg-gray-50 px-1 text-xs text-black">{t('gameInfo.datePlace')}</span>
                        <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-x-2 gap-y-2 items-center mb-2">
                            <label className="w-24 text-gray-700">{t('gameInfo.date')}</label>
                            <input className="border border-gray-400 px-1 py-0.5 w-full bg-white" value={data.date} onChange={set('date')} />
                            <label className="w-24 text-gray-700 pl-2">{t('gameInfo.place')}</label>
                            <input className="border border-gray-400 px-1 py-0.5 w-full bg-white" value={data.place} onChange={set('place')} />

                            <label className="w-24 text-gray-700">{t('gameInfo.time')}</label>
                            <input className="border border-gray-400 px-1 py-0.5 w-full bg-white" value={data.time} onChange={set('time')} />
                            <label className="w-24 text-gray-700 pl-2">{t('gameInfo.round')}</label>
                            <input className="border border-gray-400 px-1 py-0.5 w-full bg-white" value={data.round} onChange={set('round')} />
                        </div>
                        <div className="grid grid-cols-[auto_1fr] gap-2 items-center">
                            <label className="w-24 text-gray-700">{t('gameInfo.event')}</label>
                            <input className="border border-gray-400 px-1 py-0.5 w-full bg-white" value={data.event} onChange={set('event')} />
                        </div>
                    </div>

                    {/* Other Section */}
                    <div className="border border-gray-300 rounded p-2 bg-gray-50 relative pt-4">
                        <span className="absolute -top-2.5 left-2 bg-gray-50 px-1 text-xs text-black">{t('gameInfo.other')}</span>
                        <div className="grid grid-cols-[auto_1fr] gap-2 items-center mb-2">
                            <label className="w-24 text-gray-700">{t('gameInfo.recorder')}</label>
                            <input className="border border-gray-400 px-1 py-0.5 w-full bg-white" value={data.user} onChange={set('user')} />
                        </div>
                        <div className="grid grid-cols-[auto_1fr] gap-2 items-center mb-2">
                            <label className="w-24 text-gray-700">{t('gameInfo.source')}</label>
                            <input className="border border-gray-400 px-1 py-0.5 w-full bg-white" value={data.source} onChange={set('source')} />
                        </div>
                        <div className="grid grid-cols-[auto_1fr] gap-2 items-start mb-2">
                            <label className="w-24 text-gray-700 pt-1">{t('gameInfo.comment')}</label>
                            <textarea className="border border-gray-400 px-1 py-0.5 w-full bg-white h-16 resize-y" value={data.gameComment} onChange={set('gameComment')} />
                        </div>
                        <div className="grid grid-cols-[auto_1fr] gap-2 items-center mb-2">
                            <label className="w-24 text-gray-700">{t('gameInfo.copyright')}</label>
                            <input className="border border-gray-400 px-1 py-0.5 w-full bg-white" value={data.copyright} onChange={set('copyright')} />
                        </div>
                        <div className="grid grid-cols-[auto_1fr] gap-2 items-center">
                            <label className="w-24 text-gray-700">{t('gameInfo.annotation')}</label>
                            <input className="border border-gray-400 px-1 py-0.5 w-full bg-white" value={data.annotation} onChange={set('annotation')} />
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-3 border-t border-gray-300 bg-gray-200 rounded-b-lg flex justify-end gap-2">
                    <button onClick={props.onClose} className="px-4 py-1.5 bg-white border border-gray-400 rounded hover:bg-gray-50 text-black text-xs shadow-sm w-20">
                        {t('gameInfo.cancel')}
                    </button>
                    <button onClick={handleOk} className="px-4 py-1.5 bg-blue-600 border border-blue-700 rounded hover:bg-blue-700 text-white text-xs shadow-sm w-20">
                        {t('gameInfo.ok')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GameInfoModal;
