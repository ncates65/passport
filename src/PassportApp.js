import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Circle, 
  ChevronRight, 
  ChevronLeft, 
  FileText, 
  Users, 
  Camera, 
  CreditCard, 
  MapPin, 
  AlertCircle,
  Printer,
  ShieldCheck,
  Baby
} from 'lucide-react';

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-lg shadow-sm border border-slate-200 ${className}`}>
    {children}
  </div>
);

const Button = ({ onClick, variant = "primary", className = "", children, disabled = false }) => {
  const baseStyle = "px-4 py-2 rounded-md font-medium transition-colors duration-200 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:bg-slate-100",
    outline: "bg-transparent text-blue-600 border border-blue-600 hover:bg-blue-50"
  };
  
  return (
    <button 
      onClick={onClick} 
      className={`${baseStyle} ${variants[variant]} ${className}`}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default function PassportApp() {
  // State
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [scenario, setScenario] = useState('both_present'); // 'both_present', 'one_absent', 'sole_custody', 'neither_present'
  const [feeOptions, setFeeOptions] = useState({
    type: 'book', // 'book', 'card', 'both'
    expedited: false,
    shipping: false
  });

  // Data
  const scenarios = {
    both_present: {
      label: "Both Parents Present",
      description: "Both parents/guardians can appear in person with the child."
    },
    one_absent: {
      label: "One Parent Absent",
      description: "One parent is unable to attend the appointment."
    },
    sole_custody: {
      label: "Sole Legal Custody",
      description: "You are the only parent/guardian with legal custody."
    },
    neither_present: {
      label: "Neither Parent Present",
      description: "A third party (e.g., grandparent) is applying with the child."
    }
  };

  const steps = [
    {
      id: 'forms',
      title: 'Form DS-11',
      icon: <FileText className="w-6 h-6" />,
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-md border border-blue-100 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              <strong>Crucial Rule:</strong> Do not sign the application until instructed to do so by the acceptance agent at your appointment.
            </p>
          </div>
          <ul className="list-disc pl-5 space-y-2 text-slate-700">
            <li>Complete <strong>Form DS-11</strong> using the online form filler or by printing the PDF.</li>
            <li>If printing, use <strong>single-sided</strong> pages only. Double-sided forms are often rejected.</li>
            <li>Ensure all information matches the child's citizenship documents exactly.</li>
            <li>Provide your Social Security Number. If you don't have one, you must submit a signed statement.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'citizenship',
      title: 'Citizenship Evidence',
      icon: <ShieldCheck className="w-6 h-6" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-700">You must submit an <strong>original</strong> or certified copy AND a <strong>photocopy</strong>.</p>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border p-4 rounded-md">
              <h4 className="font-semibold text-slate-800 mb-2">Acceptable Originals</h4>
              <ul className="list-disc pl-4 text-sm text-slate-600 space-y-1">
                <li>U.S. Birth Certificate (with registrar's seal, filing date, & parent names)</li>
                <li>Consular Report of Birth Abroad</li>
                <li>Certificate of Citizenship</li>
                <li>Undamaged, expired U.S. passport</li>
              </ul>
            </div>
            <div className="border p-4 rounded-md bg-slate-50">
              <h4 className="font-semibold text-slate-800 mb-2">Photocopy Rules</h4>
              <ul className="list-disc pl-4 text-sm text-slate-600 space-y-1">
                <li>Legible, on white 8.5"x11" paper.</li>
                <li>Single-sided.</li>
                <li>Black and white.</li>
                <li>Do not decrease the image size.</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'relationship',
      title: 'Parental Relationship',
      icon: <Baby className="w-6 h-6" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-700">
            You must prove you are the legal parents/guardians. Usually, the citizenship document handles this, but not always.
          </p>
          <div className="bg-amber-50 p-4 rounded-md border border-amber-100 text-sm text-amber-900">
            <strong>Note:</strong> Previous U.S. passports are proof of citizenship but are <em>not</em> proof of relationship. If using an old passport for citizenship, you still need the birth certificate for relationship proof.
          </div>
          <p className="font-semibold text-slate-800">Submit one of the following:</p>
          <ul className="list-disc pl-5 space-y-2 text-slate-700">
            <li>U.S. birth certificate (also proofs citizenship)</li>
            <li>Foreign birth certificate</li>
            <li>Adoption decree</li>
            <li>Divorce/Custody decree</li>
          </ul>
        </div>
      )
    },
    {
      id: 'consent',
      title: 'Parental Consent',
      icon: <Users className="w-6 h-6" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-700 mb-4">
            Federal law requires both parents/guardians to authorize a passport for a child under 16.
          </p>
          
          <div className="bg-slate-100 p-4 rounded-lg border border-slate-200">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2 mb-2">
              <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded">Selected Scenario</span>
              {scenarios[scenario].label}
            </h4>
            
            {scenario === 'both_present' && (
              <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                <li>Both parents go to the facility.</li>
                <li>Both sign the application in front of the agent.</li>
                <li>Both show valid ID.</li>
              </ul>
            )}

            {scenario === 'one_absent' && (
              <div className="space-y-3">
                <p className="text-sm text-slate-700">The absent parent must provide:</p>
                <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                  <li><strong>Form DS-3053</strong>: "Statement of Consent", notarized within the last 90 days.</li>
                  <li><strong>Photocopy of ID</strong>: Front and back of the ID presented to the notary.</li>
                </ul>
              </div>
            )}

            {scenario === 'sole_custody' && (
              <div className="space-y-3">
                <p className="text-sm text-slate-700">You must submit a court document establishing sole authority:</p>
                <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                  <li>Court order granting sole legal custody.</li>
                  <li>Court order specifically permitting you to apply for a passport.</li>
                  <li>Birth certificate listing you as the only parent.</li>
                  <li>Death certificate of the non-applying parent.</li>
                </ul>
              </div>
            )}

            {scenario === 'neither_present' && (
              <div className="space-y-3">
                <p className="text-sm text-slate-700">The third party must submit:</p>
                <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                  <li>Notarized statement or affidavit from both parents authorizing the third party.</li>
                  <li>Photocopies of parents' IDs.</li>
                  <li>If only one parent provides a statement, proof of sole custody is also required.</li>
                </ul>
              </div>
            )}
          </div>
          
          <div className="mt-4 text-sm text-slate-500">
            <button 
              onClick={() => setCurrentStep(0)} 
              className="text-blue-600 hover:underline"
            >
              Change Scenario
            </button>
          </div>
        </div>
      )
    },
    {
      id: 'id',
      title: 'Identification',
      icon: <CreditCard className="w-6 h-6" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-700">Parents/Guardians must present physical ID.</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border p-4 rounded-md">
              <h4 className="font-semibold text-slate-800 mb-2">Present Original ID</h4>
              <ul className="list-disc pl-4 text-sm text-slate-600 space-y-1">
                <li>Valid Driver's License (in-state)</li>
                <li>Valid or expired U.S. Passport</li>
                <li>Certificate of Naturalization</li>
                <li>Government Employee ID</li>
                <li>Military ID</li>
              </ul>
            </div>
            <div className="border p-4 rounded-md">
              <h4 className="font-semibold text-slate-800 mb-2">Bring Photocopies</h4>
              <ul className="list-disc pl-4 text-sm text-slate-600 space-y-1">
                <li><strong>Front AND Back</strong> of each ID.</li>
                <li>Single-sided paper.</li>
                <li>One photocopy per parent.</li>
              </ul>
            </div>
          </div>
          <div className="text-sm bg-slate-50 p-3 rounded text-slate-600 mt-2">
            If presenting an out-of-state license, you must present a second form of ID.
          </div>
        </div>
      )
    },
    {
      id: 'photo',
      title: 'Passport Photo',
      icon: <Camera className="w-6 h-6" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-700">You need <strong>one</strong> color photo taken in the last 6 months.</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
             <div className="bg-green-50 p-3 rounded border border-green-100">
               <span className="font-bold text-green-800 block mb-1">Do:</span>
               <ul className="list-disc pl-4 text-green-900 space-y-1">
                 <li>White or off-white background</li>
                 <li>Neutral facial expression or natural smile</li>
                 <li>Both eyes open</li>
                 <li>2 x 2 inches (51 x 51 mm)</li>
               </ul>
             </div>
             <div className="bg-red-50 p-3 rounded border border-red-100">
               <span className="font-bold text-red-800 block mb-1">Don't:</span>
               <ul className="list-disc pl-4 text-red-900 space-y-1">
                 <li>No glasses</li>
                 <li>No hats or head coverings (unless religious/medical signed statement)</li>
                 <li>No uniforms or camouflage</li>
                 <li>No other people in photo</li>
               </ul>
             </div>
          </div>
          <p className="text-xs text-slate-500 italic mt-2">
            Tip: Most drugstores (CVS, Walgreens) and shipping centers (FedEx, UPS) offer passport photo services.
          </p>
        </div>
      )
    },
    {
      id: 'fees',
      title: 'Calculate Fees',
      icon: <Users className="w-6 h-6" />, // Placeholder icon logic handled in render
      content: (
        <div className="space-y-6">
          <p className="text-slate-700">
            Two separate payments are required: one to the Dept of State and one to the Acceptance Facility.
          </p>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Passport Type</label>
              <div className="flex gap-2">
                {['book', 'card', 'both'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setFeeOptions({...feeOptions, type})}
                    className={`px-3 py-2 text-sm rounded border ${
                      feeOptions.type === type 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    {type === 'book' ? 'Book ($100)' : type === 'card' ? 'Card ($15)' : 'Both ($115)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <label className="text-sm font-medium text-slate-700">
                Expedited Service (+$60)
                <span className="block text-xs text-slate-500 font-normal">Reduces processing time to 2-3 weeks</span>
              </label>
              <input 
                type="checkbox" 
                checked={feeOptions.expedited}
                onChange={(e) => setFeeOptions({...feeOptions, expedited: e.target.checked})}
                className="w-5 h-5 text-blue-600"
              />
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <label className="text-sm font-medium text-slate-700">
                1-2 Day Delivery (+$21.36)
                <span className="block text-xs text-slate-500 font-normal">For the return of the book only</span>
              </label>
              <input 
                type="checkbox" 
                checked={feeOptions.shipping}
                onChange={(e) => setFeeOptions({...feeOptions, shipping: e.target.checked})}
                className="w-5 h-5 text-blue-600"
              />
            </div>
          </div>

          {/* Fee Breakdown */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">Check #1</h4>
              <p className="text-sm text-slate-600 mb-2">Payable to: <strong>"U.S. Department of State"</strong></p>
              <div className="text-3xl font-bold text-slate-800">
                ${(feeOptions.type === 'book' ? 100 : feeOptions.type === 'card' ? 15 : 115) + (feeOptions.expedited ? 60 : 0) + (feeOptions.shipping ? 21.36 : 0)}
              </div>
              <p className="text-xs text-slate-500 mt-2">Write child's full name & DOB in memo.</p>
            </div>
            
            <div className="bg-slate-100 p-4 rounded-lg border border-slate-200">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Check #2 / Card</h4>
              <p className="text-sm text-slate-600 mb-2">Payable to: <strong>Acceptance Facility</strong></p>
              <div className="text-3xl font-bold text-slate-800">
                $35.00
              </div>
              <p className="text-xs text-slate-500 mt-2">Execution fee (fixed).</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'submit',
      title: 'Submit in Person',
      icon: <MapPin className="w-6 h-6" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-700">
            You cannot mail this application. You must go to an authorized acceptance facility.
          </p>
          <ul className="list-disc pl-5 space-y-2 text-slate-700">
            <li>Find a facility (Post Office, Library, Clerk of Court).</li>
            <li>Make an appointment (many post offices require this).</li>
            <li>Bring your child (mandatory appearance).</li>
            <li>Bring all original docs + photocopies.</li>
            <li>Bring your separate payments.</li>
          </ul>
          <div className="bg-blue-50 p-4 rounded mt-4 text-center">
             <a 
               href="https://iafdb.travel.state.gov/" 
               target="_blank" 
               rel="noreferrer"
               className="text-blue-700 font-semibold hover:underline"
             >
               Find a Passport Acceptance Facility &rarr;
             </a>
          </div>
        </div>
      )
    }
  ];

  // Progress logic
  const toggleStep = (idx) => {
    if (completedSteps.includes(idx)) {
      setCompletedSteps(completedSteps.filter(i => i !== idx));
    } else {
      setCompletedSteps([...completedSteps, idx]);
    }
  };

  const progress = Math.round((completedSteps.length / steps.length) * 100);

  // Render Logic
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-600 p-2 rounded text-white">
              <FileText className="w-6 h-6" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Passport Pal</h1>
          </div>
          <p className="text-slate-600">A simplified guide for U.S. Passport applications for children under 16.</p>
        </header>

        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Sidebar / Navigation */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Progress Card */}
            <Card className="p-6 sticky top-6">
              <div className="flex justify-between items-end mb-2">
                <span className="font-semibold text-slate-700">Your Progress</span>
                <span className="text-blue-600 font-bold">{progress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 mb-6">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>

              {/* Scenario Selector */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Family Situation
                </label>
                <select 
                  value={scenario} 
                  onChange={(e) => setScenario(e.target.value)}
                  className="w-full p-2 text-sm border border-slate-300 rounded-md bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {Object.entries(scenarios).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  {scenarios[scenario].description}
                </p>
              </div>

              {/* Step List (Desktop) */}
              <nav className="hidden lg:block space-y-1">
                {steps.map((step, idx) => (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStep(idx)}
                    className={`w-full flex items-center gap-3 p-2 rounded-md transition-colors text-left ${
                      currentStep === idx ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`
                      flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center border
                      ${completedSteps.includes(idx) 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : 'border-slate-300'
                      }
                    `}>
                      {completedSteps.includes(idx) && <CheckCircle className="w-3 h-3" />}
                    </div>
                    <span className="text-sm truncate">{idx + 1}. {step.title}</span>
                  </button>
                ))}
              </nav>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2">
            <Card className="p-6 min-h-[500px] flex flex-col">
              {/* Step Header */}
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                  {steps[currentStep].icon}
                </div>
                <div>
                  <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                    Step {currentStep + 1} of {steps.length}
                  </span>
                  <h2 className="text-2xl font-bold text-slate-800">{steps[currentStep].title}</h2>
                </div>
              </div>

              {/* Step Content */}
              <div className="flex-grow">
                {steps[currentStep].content}
              </div>

              {/* Step Footer / Navigation */}
              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                <Button 
                  variant="secondary" 
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  disabled={currentStep === 0}
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </Button>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => toggleStep(currentStep)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                      completedSteps.includes(currentStep)
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {completedSteps.includes(currentStep) ? (
                      <>
                        <CheckCircle className="w-4 h-4" /> Completed
                      </>
                    ) : (
                      <>
                        <Circle className="w-4 h-4" /> Mark Complete
                      </>
                    )}
                  </button>

                  <Button 
                    variant="primary" 
                    onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                    disabled={currentStep === steps.length - 1}
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
            
            <div className="mt-6 text-center text-xs text-slate-400">
              Disclaimer: This app is a guide and not an official government tool. 
              Always verify details at travel.state.gov.
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
