"""
Exemplo de Consulta ao Agente Jurídico

Este script demonstra como fazer consultas sobre legislação de licitações.
"""

import sys
sys.path.append('..')

from agente import AgenteJuridico


def main():
    print("=" * 60)
    print("AGENTE JURÍDICO LICITAGYM - EXEMPLO DE CONSULTA")
    print("=" * 60)
    
    # Inicializar agente
    print("\n[1/3] Inicializando agente...")
    agente = AgenteJuridico()
    
    # Carregar modelo (pode demorar na primeira vez)
    print("[2/3] Carregando modelos de ML (isso pode levar alguns minutos)...")
    try:
        agente.carregar_modelo()
        print("       Modelos carregados com sucesso!")
    except Exception as e:
        print(f"       Aviso: Erro ao carregar modelos: {e}")
        print("       Funcionalidades limitadas serão usadas.")
    
    # Loop de consultas
    print("[3/3] Pronto para consultas!")
    print("\nDigite suas perguntas sobre legislação de licitações.")
    print("Digite 'sair' para encerrar.\n")
    
    while True:
        try:
            pergunta = input("📝 Pergunta: ").strip()
            
            if pergunta.lower() in ['sair', 'exit', 'quit']:
                print("\nEncerrando...")
                break
            
            if not pergunta:
                continue
            
            # Processar consulta
            print("\n⏳ Processando consulta...")
            resposta = agente.consultar(pergunta)
            
            # Exibir resultados
            print("\n" + "=" * 60)
            print("RESPOSTA")
            print("=" * 60)
            
            print(f"\n📋 Classificação: {resposta['classificacao']['tipo'].upper()}")
            print(f"🎯 Confiança: {resposta['classificacao']['confianca']:.0%}")
            print(f"📚 Documentos relacionados: {resposta['total_documentos']}")
            
            if resposta['entidades']['numeros_lei']:
                print(f"⚖️  Leis mencionadas: {', '.join(resposta['entidades']['numeros_lei'])}")
            
            if resposta['fundamentacao']:
                print("\n💡 FUNDAMENTAÇÃO JURÍDICA:")
                for i, fund in enumerate(resposta['fundamentacao'][:5], 1):
                    print(f"   {i}. {fund}")
            
            if resposta['documentos_citados']:
                print("\n📖 DOCUMENTOS CITADOS:")
                for doc in resposta['documentos_citados'][:3]:
                    print(f"   • {doc['tipo']} nº {doc['numero']}/{doc['ano']}")
                    print(f"     {doc['trecho_relevante']}")
            
            if resposta['recomendacoes']:
                print("\n✅ RECOMENDAÇÕES:")
                for rec in resposta['recomendacoes']:
                    print(f"   • {rec}")
            
            print("\n" + "=" * 60)
            print()
            
        except KeyboardInterrupt:
            print("\n\nConsulta interrompida pelo usuário.")
            break
        except Exception as e:
            print(f"\n❌ Erro: {e}")
            print("   Tente novamente ou verifique a configuração.\n")


if __name__ == "__main__":
    main()
